package services

import (
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"

	"go.uber.org/zap"
)

type ContainerConfig struct {
	Image         string
	Env           map[string]string
	ExposedPorts  []string
	CPULimit      int64
	MemoryLimit   int64
	PidsLimit     int64
	NetworkName   string
	Networks      []NetworkAttachment
	ContainerName string
	Labels        map[string]string
}

type NetworkAttachment struct {
	Name    string
	Aliases []string
}

type NetworkOptions struct {
	Internal bool
	Subnet   string
	Labels   map[string]string
}

type ContainerInfo struct {
	ContainerID string
	Ports       map[string]string
	NetworkID   string
}

type ContainerService struct {
	cli       *client.Client
	baseURL   string
	netPrefix string
	logger    *zap.Logger
}

func NewContainerService(dockerHost, baseURL, netPrefix string, logger *zap.Logger) (*ContainerService, error) {
	cli, err := client.NewClientWithOpts(
		client.WithHost(dockerHost),
		client.WithAPIVersionNegotiation(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create docker client: %w", err)
	}

	return &ContainerService{
		cli:       cli,
		baseURL:   baseURL,
		netPrefix: netPrefix,
		logger:    logger,
	}, nil
}

func (s *ContainerService) EnsureImage(ctx context.Context, imageName string) error {
	_, _, err := s.cli.ImageInspectWithRaw(ctx, imageName)
	if err == nil {
		return nil
	}

	s.logger.Info("pulling image", zap.String("image", imageName))
	reader, err := s.cli.ImagePull(ctx, imageName, image.PullOptions{})
	if err != nil {
		return fmt.Errorf("failed to pull image %s: %w", imageName, err)
	}
	defer reader.Close()
	_, _ = io.Copy(io.Discard, reader)
	return nil
}

func (s *ContainerService) EnsureNetwork(ctx context.Context, networkName string) (string, error) {
	return s.EnsureNetworkWithOptions(ctx, networkName, NetworkOptions{})
}

func (s *ContainerService) EnsureNetworkWithOptions(ctx context.Context, networkName string, opts NetworkOptions) (string, error) {
	networks, err := s.cli.NetworkList(ctx, network.ListOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to list networks: %w", err)
	}

	for _, n := range networks {
		if n.Name == networkName {
			return n.ID, nil
		}
	}

	labels := map[string]string{"managed-by": "security-range"}
	for k, v := range opts.Labels {
		labels[k] = v
	}
	createOptions := network.CreateOptions{
		Driver:     "bridge",
		Internal:   opts.Internal,
		Attachable: true,
		Labels:     labels,
	}
	if opts.Subnet != "" {
		createOptions.IPAM = &network.IPAM{
			Config: []network.IPAMConfig{{Subnet: opts.Subnet}},
		}
	}

	resp, err := s.cli.NetworkCreate(ctx, networkName, createOptions)
	if err != nil {
		return "", fmt.Errorf("failed to create network %s: %w", networkName, err)
	}
	return resp.ID, nil
}

func (s *ContainerService) CreateAndStart(ctx context.Context, cfg *ContainerConfig) (*ContainerInfo, error) {
	if err := s.EnsureImage(ctx, cfg.Image); err != nil {
		return nil, err
	}

	attachments := cfg.Networks
	if len(attachments) == 0 && cfg.NetworkName != "" {
		attachments = []NetworkAttachment{{Name: cfg.NetworkName}}
	}
	if len(attachments) == 0 {
		return nil, fmt.Errorf("at least one network is required")
	}

	networkIDs := make(map[string]string, len(attachments))
	for _, attachment := range attachments {
		networkID, err := s.EnsureNetwork(ctx, attachment.Name)
		if err != nil {
			return nil, err
		}
		networkIDs[attachment.Name] = networkID
	}

	envList := make([]string, 0, len(cfg.Env))
	for k, v := range cfg.Env {
		envList = append(envList, fmt.Sprintf("%s=%s", k, v))
	}

	exposedPorts := nat.PortSet{}
	portBindings := nat.PortMap{}
	for _, p := range cfg.ExposedPorts {
		port := nat.Port(p + "/tcp")
		exposedPorts[port] = struct{}{}
		portBindings[port] = []nat.PortBinding{{HostIP: "0.0.0.0", HostPort: ""}}
	}

	resources := container.Resources{}
	if cfg.CPULimit > 0 {
		resources.NanoCPUs = cfg.CPULimit * 1e9 / 2
	}
	if cfg.MemoryLimit > 0 {
		resources.Memory = cfg.MemoryLimit
	}
	if cfg.PidsLimit > 0 {
		resources.PidsLimit = &cfg.PidsLimit
	}

	hostConfig := &container.HostConfig{
		PortBindings:  portBindings,
		Resources:     resources,
		RestartPolicy: container.RestartPolicy{Name: "no"},
		AutoRemove:    false,
	}

	networkingConfig := &network.NetworkingConfig{
		EndpointsConfig: make(map[string]*network.EndpointSettings, len(attachments)),
	}
	for _, attachment := range attachments {
		networkingConfig.EndpointsConfig[attachment.Name] = &network.EndpointSettings{
			Aliases: attachment.Aliases,
		}
	}

	resp, err := s.cli.ContainerCreate(ctx,
		&container.Config{
			Image:        cfg.Image,
			Env:          envList,
			ExposedPorts: exposedPorts,
			Labels:       cfg.Labels,
		},
		hostConfig,
		networkingConfig,
		nil,
		cfg.ContainerName,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create container: %w", err)
	}

	if err := s.cli.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
		_ = s.cli.ContainerRemove(ctx, resp.ID, container.RemoveOptions{Force: true})
		return nil, fmt.Errorf("failed to start container: %w", err)
	}

	inspect, err := s.cli.ContainerInspect(ctx, resp.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect container: %w", err)
	}

	ports := make(map[string]string)
	for port, bindings := range inspect.NetworkSettings.Ports {
		if len(bindings) > 0 {
			ports[string(port)] = bindings[0].HostPort
		}
	}

	primaryNetwork := attachments[0].Name
	return &ContainerInfo{
		ContainerID: resp.ID,
		Ports:       ports,
		NetworkID:   networkIDs[primaryNetwork],
	}, nil
}

func (s *ContainerService) Stop(ctx context.Context, containerID string) error {
	timeout := 10
	return s.cli.ContainerStop(ctx, containerID, container.StopOptions{Timeout: &timeout})
}

func (s *ContainerService) Remove(ctx context.Context, containerID string) error {
	return s.cli.ContainerRemove(ctx, containerID, container.RemoveOptions{Force: true})
}

func (s *ContainerService) StopAndRemove(ctx context.Context, containerID string) error {
	if containerID == "" {
		return nil
	}
	_ = s.Stop(ctx, containerID)
	return s.Remove(ctx, containerID)
}

func (s *ContainerService) RemoveNetwork(ctx context.Context, networkName string) error {
	return s.cli.NetworkRemove(ctx, networkName)
}

func (s *ContainerService) IsRunning(ctx context.Context, containerID string) bool {
	if containerID == "" {
		return false
	}
	inspect, err := s.cli.ContainerInspect(ctx, containerID)
	if err != nil {
		return false
	}
	return inspect.State.Running
}

func (s *ContainerService) BuildAccessURL(ports map[string]string) string {
	for _, hostPort := range ports {
		if hostPort != "" {
			return fmt.Sprintf("%s:%s", s.baseURL, hostPort)
		}
	}
	return ""
}

func (s *ContainerService) NetworkName(competitionID, teamID int) string {
	return fmt.Sprintf("%s_%d_team_%d", s.netPrefix, competitionID, teamID)
}

func (s *ContainerService) ContainerName(challengeID, competitionID, teamID int) string {
	return fmt.Sprintf("%s_c%d_comp%d_t%d", s.netPrefix, challengeID, competitionID, teamID)
}

func (s *ContainerService) ParseExposedPorts(portsJSON []map[string]interface{}) []string {
	ports := make([]string, 0)
	for _, p := range portsJSON {
		if port, ok := p["port"]; ok {
			ports = append(ports, fmt.Sprintf("%v", port))
		}
	}
	return ports
}

func (s *ContainerService) ParseResourceLimits(limits map[string]interface{}) (cpuLimit int64, memLimit int64, pidsLimit int64) {
	if v, ok := limits["cpu_limit"]; ok {
		switch val := v.(type) {
		case float64:
			cpuLimit = int64(val * 1e9)
		case string:
			if strings.HasSuffix(val, "m") {
				fmt.Sscanf(val, "%dm", &cpuLimit)
				cpuLimit *= 1e6
			}
		}
	}
	if v, ok := limits["memory_limit"]; ok {
		switch val := v.(type) {
		case float64:
			memLimit = int64(val)
		case string:
			if strings.HasSuffix(val, "m") || strings.HasSuffix(val, "M") {
				fmt.Sscanf(strings.TrimRight(val, "mM"), "%d", &memLimit)
				memLimit *= 1024 * 1024
			} else if strings.HasSuffix(val, "g") || strings.HasSuffix(val, "G") {
				fmt.Sscanf(strings.TrimRight(val, "gG"), "%d", &memLimit)
				memLimit *= 1024 * 1024 * 1024
			}
		}
	}
	if v, ok := limits["pids_limit"]; ok {
		if val, ok := v.(float64); ok {
			pidsLimit = int64(val)
		}
	}
	return
}

type ImageInfo struct {
	ID      string   `json:"id"`
	Tags    []string `json:"tags"`
	Size    int64    `json:"size"`
	Created int64    `json:"created"`
}

func (s *ContainerService) ListImages(ctx context.Context) ([]ImageInfo, error) {
	images, err := s.cli.ImageList(ctx, image.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list images: %w", err)
	}

	result := make([]ImageInfo, 0, len(images))
	for _, img := range images {
		if len(img.RepoTags) == 0 || img.RepoTags[0] == "<none>:<none>" {
			continue
		}
		result = append(result, ImageInfo{
			ID:      img.ID[:12],
			Tags:    img.RepoTags,
			Size:    img.Size,
			Created: img.Created,
		})
	}
	return result, nil
}

func (s *ContainerService) PullImage(ctx context.Context, imageName string) error {
	s.logger.Info("pulling image", zap.String("image", imageName))
	reader, err := s.cli.ImagePull(ctx, imageName, image.PullOptions{})
	if err != nil {
		return fmt.Errorf("failed to pull image %s: %w", imageName, err)
	}
	defer reader.Close()
	_, _ = io.Copy(io.Discard, reader)
	return nil
}

func (s *ContainerService) RemoveImage(ctx context.Context, imageID string) error {
	_, err := s.cli.ImageRemove(ctx, imageID, image.RemoveOptions{Force: false, PruneChildren: true})
	if err != nil {
		return fmt.Errorf("failed to remove image %s: %w", imageID, err)
	}
	return nil
}

func (s *ContainerService) RenewInstance(ctx context.Context, containerID string) bool {
	if containerID == "" {
		return false
	}
	inspect, err := s.cli.ContainerInspect(ctx, containerID)
	if err != nil {
		return false
	}
	return inspect.State.Running
}

func (s *ContainerService) ExecInContainer(ctx context.Context, containerID string, cmd []string) error {
	exec, err := s.cli.ContainerExecCreate(ctx, containerID, container.ExecOptions{
		Cmd:          cmd,
		AttachStdout: false,
		AttachStderr: false,
	})
	if err != nil {
		return fmt.Errorf("exec create: %w", err)
	}
	return s.cli.ContainerExecStart(ctx, exec.ID, container.ExecStartOptions{})
}

func (s *ContainerService) Close() error {
	return s.cli.Close()
}
