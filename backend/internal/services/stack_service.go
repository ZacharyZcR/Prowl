package services

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"go.uber.org/zap"

	"github.com/ZacharyZcR/STC/backend/internal/models"
)

type StackService struct {
	container *ContainerService
	logger    *zap.Logger
}

type StackConfig struct {
	ChallengeID   int
	CompetitionID int
	TeamID        int
	Flag          string
	Topology      *models.NetworkTopology
	CPULimit      int64
	MemoryLimit   int64
	PidsLimit     int64
	Labels        map[string]string
}

type StackInfo struct {
	StackID      string
	EntryService string
	ContainerID  string
	Containers   map[string]string
	Networks     map[string]string
	Ports        map[string]string
}

var stackNameCleaner = regexp.MustCompile(`[^a-zA-Z0-9_.-]+`)

func NewStackService(container *ContainerService, logger *zap.Logger) *StackService {
	return &StackService{container: container, logger: logger}
}

func (s *StackService) Start(ctx context.Context, cfg StackConfig) (*StackInfo, error) {
	if cfg.Topology == nil || cfg.Topology.IsEmpty() {
		return nil, fmt.Errorf("network topology is required")
	}
	if err := cfg.Topology.Validate(); err != nil {
		return nil, err
	}

	stackID := StackID(cfg.ChallengeID, cfg.CompetitionID, cfg.TeamID)
	entryServiceName := strings.TrimSpace(cfg.Topology.EntryService)
	networkNames := make(map[string]string, len(cfg.Topology.Networks))
	networkIDs := make(map[string]string, len(cfg.Topology.Networks))
	containers := make(map[string]string, len(cfg.Topology.Services))

	cleanup := func() {
		_ = s.Stop(ctx, containers, networkNames)
	}

	for _, net := range cfg.Topology.Networks {
		networkName := strings.TrimSpace(net.Name)
		net.Name = networkName
		actualName := stackResourceName(stackID, "net", networkName)
		networkID, err := s.container.EnsureNetworkWithOptions(ctx, actualName, NetworkOptions{
			Internal:            net.Internal,
			Subnet:              net.Subnet,
			AllowSubnetFallback: true,
			Labels:              stackNetworkLabels(cfg.Labels, stackID, net),
		})
		if err != nil {
			cleanup()
			return nil, err
		}
		networkNames[networkName] = actualName
		networkIDs[networkName] = networkID
	}

	var entryContainerID string
	var entryPorts map[string]string
	for _, service := range cfg.Topology.Services {
		serviceName := strings.TrimSpace(service.Name)
		service.Name = serviceName
		attachments := make([]NetworkAttachment, 0, len(service.Networks))
		for _, logicalNetwork := range service.Networks {
			logicalNetwork = strings.TrimSpace(logicalNetwork)
			attachments = append(attachments, NetworkAttachment{
				Name:    networkNames[logicalNetwork],
				Aliases: []string{serviceName},
			})
		}

		exposedPorts := []string(nil)
		if serviceName == entryServiceName && service.ExposeToPlayer {
			exposedPorts = exposedPortsForService(service)
		}

		info, err := s.container.CreateAndStart(ctx, &ContainerConfig{
			Image:         service.Image,
			Env:           stackEnv(cfg.Flag, service.Env),
			ExposedPorts:  exposedPorts,
			CPULimit:      cfg.CPULimit,
			MemoryLimit:   cfg.MemoryLimit,
			PidsLimit:     cfg.PidsLimit,
			Networks:      attachments,
			ContainerName: stackResourceName(stackID, "svc", serviceName),
			Labels:        stackLabels(cfg.Labels, stackID, "service", serviceName),
		})
		if err != nil {
			cleanup()
			return nil, fmt.Errorf("failed to start service %s: %w", serviceName, err)
		}

		containers[serviceName] = info.ContainerID
		if serviceName == entryServiceName {
			entryContainerID = info.ContainerID
			entryPorts = info.Ports
		}
	}

	return &StackInfo{
		StackID:      stackID,
		EntryService: entryServiceName,
		ContainerID:  entryContainerID,
		Containers:   containers,
		Networks:     networkNames,
		Ports:        entryPorts,
	}, nil
}

func (s *StackService) Stop(ctx context.Context, containers, networks map[string]string) error {
	for _, containerID := range containers {
		_ = s.container.StopAndRemove(ctx, containerID)
	}
	for _, networkName := range networks {
		_ = s.container.RemoveNetwork(ctx, networkName)
	}
	return nil
}

func StackID(challengeID, competitionID, teamID int) string {
	return fmt.Sprintf("range_c%d_comp%d_t%d", challengeID, competitionID, teamID)
}

func stackResourceName(stackID, kind, name string) string {
	clean := stackNameCleaner.ReplaceAllString(strings.TrimSpace(name), "_")
	clean = strings.Trim(clean, "_.-")
	if clean == "" {
		clean = "default"
	}
	return fmt.Sprintf("%s_%s_%s", stackID, kind, clean)
}

func stackLabels(base map[string]string, stackID, resourceType, resourceName string) map[string]string {
	labels := make(map[string]string, len(base)+4)
	for k, v := range base {
		labels[k] = v
	}
	labels["stack-id"] = stackID
	labels["stack-resource-type"] = resourceType
	labels["stack-resource-name"] = resourceName
	return labels
}

func stackNetworkLabels(base map[string]string, stackID string, net models.TopologyNetwork) map[string]string {
	labels := stackLabels(base, stackID, "network", net.Name)
	labels["topology-network-exposed"] = fmt.Sprintf("%t", net.Exposed)
	labels["topology-network-internal"] = fmt.Sprintf("%t", net.Internal)
	if net.Subnet != "" {
		labels["topology-network-requested-subnet"] = net.Subnet
	}
	return labels
}

func exposedPortsForService(service models.TopologyService) []string {
	if len(service.Ports) == 0 {
		return []string{"80"}
	}
	ports := make([]string, 0, len(service.Ports))
	for _, port := range service.Ports {
		ports = append(ports, strings.TrimSpace(port))
	}
	return ports
}

func stackEnv(flag string, serviceEnv map[string]string) map[string]string {
	env := map[string]string{"FLAG": flag}
	for key, value := range serviceEnv {
		value = strings.ReplaceAll(value, "{{FLAG}}", flag)
		value = strings.ReplaceAll(value, "${FLAG}", flag)
		env[key] = value
	}
	return env
}
