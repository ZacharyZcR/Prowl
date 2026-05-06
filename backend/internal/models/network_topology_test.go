package models

import "testing"

func TestNetworkTopologyValidate_Success(t *testing.T) {
	topology := &NetworkTopology{
		Networks: []TopologyNetwork{
			{Name: "dmz", Subnet: "10.10.1.0/24", Exposed: true},
			{Name: "internal", Subnet: "10.10.2.0/24", Internal: true},
		},
		Services: []TopologyService{
			{Name: "web", Image: "web:latest", Networks: []string{"dmz"}, Ports: []string{"80"}},
			{Name: "jump", Image: "jump:latest", Networks: []string{"dmz", "internal"}},
			{Name: "db", Image: "mysql:8", Networks: []string{"internal"}},
		},
		EntryService: "web",
	}

	if err := topology.Validate(); err != nil {
		t.Fatalf("expected valid topology, got %v", err)
	}
}

func TestNetworkTopologyValidate_UnknownNetwork(t *testing.T) {
	topology := &NetworkTopology{
		Networks: []TopologyNetwork{{Name: "dmz"}},
		Services: []TopologyService{
			{Name: "web", Image: "web:latest", Networks: []string{"internal"}},
		},
		EntryService: "web",
	}

	if err := topology.Validate(); err == nil {
		t.Fatal("expected validation error for unknown network")
	}
}

func TestNetworkTopologyValidate_DuplicateService(t *testing.T) {
	topology := &NetworkTopology{
		Networks: []TopologyNetwork{{Name: "dmz"}},
		Services: []TopologyService{
			{Name: "web", Image: "web:latest", Networks: []string{"dmz"}},
			{Name: "web", Image: "web:latest", Networks: []string{"dmz"}},
		},
		EntryService: "web",
	}

	if err := topology.Validate(); err == nil {
		t.Fatal("expected validation error for duplicate service")
	}
}
