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

	networkNames := make(map[string]TopologyNetwork, len(t.Networks))
	for i, network := range t.Networks {
		name := strings.TrimSpace(network.Name)
		if name == "" {
			return fmt.Errorf("network_topology.networks[%d].name is required", i)
		}
		if _, exists := networkNames[name]; exists {
			return fmt.Errorf("network_topology.networks[%d].name %q is duplicated", i, name)
		}
		if network.Internal && network.Exposed {
			return fmt.Errorf("network_topology.networks[%d] cannot be both internal and exposed", i)
		}
		network.Name = name
		networkNames[name] = network
	}

	serviceNames := make(map[string]TopologyService, len(t.Services))
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
		serviceNetworkNames := make(map[string]struct{}, len(service.Networks))
		for j, networkName := range service.Networks {
			networkName = strings.TrimSpace(networkName)
			if networkName == "" {
				return fmt.Errorf("network_topology.services[%d].networks[%d] is required", i, j)
			}
			if _, exists := networkNames[networkName]; !exists {
				return fmt.Errorf("network_topology.services[%d].networks[%d] references unknown network %q", i, j, networkName)
			}
			if _, exists := serviceNetworkNames[networkName]; exists {
				return fmt.Errorf("network_topology.services[%d].networks[%d] references duplicated network %q", i, j, networkName)
			}
			serviceNetworkNames[networkName] = struct{}{}
		}
		servicePorts := make(map[string]struct{}, len(service.Ports))
		for j, port := range service.Ports {
			port = strings.TrimSpace(port)
			if port == "" {
				return fmt.Errorf("network_topology.services[%d].ports[%d] is required", i, j)
			}
			if _, exists := servicePorts[port]; exists {
				return fmt.Errorf("network_topology.services[%d].ports[%d] is duplicated", i, j)
			}
			servicePorts[port] = struct{}{}
		}
		service.Name = name
		serviceNames[name] = service
	}

	entry := strings.TrimSpace(t.EntryService)
	if entry == "" {
		return errors.New("network_topology.entry_service is required")
	}
	entryService, exists := serviceNames[entry]
	if !exists {
		return fmt.Errorf("network_topology.entry_service references unknown service %q", entry)
	}
	if !entryService.ExposeToPlayer {
		return errors.New("network_topology.entry_service must set expose_to_player=true")
	}

	entryOnExposedNetwork := false
	for _, networkName := range entryService.Networks {
		network := networkNames[strings.TrimSpace(networkName)]
		if network.Exposed && !network.Internal {
			entryOnExposedNetwork = true
			break
		}
	}
	if !entryOnExposedNetwork {
		return fmt.Errorf("network_topology.entry_service %q must attach to an exposed network", entry)
	}

	for i, service := range t.Services {
		name := strings.TrimSpace(service.Name)
		if name != entry && service.ExposeToPlayer {
			return fmt.Errorf("network_topology.services[%d].expose_to_player is only allowed on entry_service", i)
		}
	}
	return nil
}
