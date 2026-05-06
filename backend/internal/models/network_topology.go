package models

import (
	"errors"
	"fmt"
	"strings"
)

type NetworkTopology struct {
	Services     []TopologyService `json:"services"`
	Networks     []TopologyNetwork `json:"networks"`
	EntryService string            `json:"entry_service"`
}

type TopologyService struct {
	Name           string            `json:"name"`
	Image          string            `json:"image"`
	Networks       []string          `json:"networks"`
	Ports          []string          `json:"ports"`
	Env            map[string]string `json:"env"`
	Entrypoint     string            `json:"entrypoint"`
	ExposeToPlayer bool              `json:"expose_to_player"`
}

type TopologyNetwork struct {
	Name     string `json:"name"`
	Subnet   string `json:"subnet"`
	Internal bool   `json:"internal"`
	Exposed  bool   `json:"exposed"`
}

func (t *NetworkTopology) IsEmpty() bool {
	return t == nil || (len(t.Services) == 0 && len(t.Networks) == 0 && strings.TrimSpace(t.EntryService) == "")
}

func (t *NetworkTopology) Validate() error {
	if t.IsEmpty() {
		return nil
	}
	if len(t.Services) == 0 {
		return errors.New("network_topology.services is required")
	}
	if len(t.Networks) == 0 {
		return errors.New("network_topology.networks is required")
	}

	networkNames := make(map[string]struct{}, len(t.Networks))
	for i, network := range t.Networks {
		name := strings.TrimSpace(network.Name)
		if name == "" {
			return fmt.Errorf("network_topology.networks[%d].name is required", i)
		}
		if _, exists := networkNames[name]; exists {
			return fmt.Errorf("network_topology.networks[%d].name %q is duplicated", i, name)
		}
		networkNames[name] = struct{}{}
	}

	serviceNames := make(map[string]struct{}, len(t.Services))
	for i, service := range t.Services {
		name := strings.TrimSpace(service.Name)
		if name == "" {
			return fmt.Errorf("network_topology.services[%d].name is required", i)
		}
		if _, exists := serviceNames[name]; exists {
			return fmt.Errorf("network_topology.services[%d].name %q is duplicated", i, name)
		}
		if strings.TrimSpace(service.Image) == "" {
			return fmt.Errorf("network_topology.services[%d].image is required", i)
		}
		if len(service.Networks) == 0 {
			return fmt.Errorf("network_topology.services[%d].networks is required", i)
		}
		for j, networkName := range service.Networks {
			networkName = strings.TrimSpace(networkName)
			if networkName == "" {
				return fmt.Errorf("network_topology.services[%d].networks[%d] is required", i, j)
			}
			if _, exists := networkNames[networkName]; !exists {
				return fmt.Errorf("network_topology.services[%d].networks[%d] references unknown network %q", i, j, networkName)
			}
		}
		serviceNames[name] = struct{}{}
	}

	entry := strings.TrimSpace(t.EntryService)
	if entry == "" {
		return errors.New("network_topology.entry_service is required")
	}
	if _, exists := serviceNames[entry]; !exists {
		return fmt.Errorf("network_topology.entry_service references unknown service %q", entry)
	}
	return nil
}
