package models

import "testing"

func TestNetworkTopologyValidate_Success(t *testing.T) {
	topology := &NetworkTopology{
		Networks: []TopologyNetwork{
			{Name: "dmz", Subnet: "10.10.1.0/24", Exposed: true},
			{Name: "internal", Subnet: "10.10.2.0/24", Internal: true},
		},
		Services: []TopologyService{
			{Name: "web", Image: "web:latest", Networks: []string{"dmz"}, Ports: []string{"80"}, ExposeToPlayer: true},
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

func TestNetworkTopologyValidate_InternalNetworkCannotBeExposed(t *testing.T) {
	topology := &NetworkTopology{
		Networks: []TopologyNetwork{{Name: "dmz", Internal: true, Exposed: true}},
		Services: []TopologyService{
			{Name: "web", Image: "web:latest", Networks: []string{"dmz"}, ExposeToPlayer: true},
		},
		EntryService: "web",
	}

	if err := topology.Validate(); err == nil {
		t.Fatal("expected validation error for internal exposed network")
	}
}

func TestNetworkTopologyValidate_EntryMustAttachToExposedNetwork(t *testing.T) {
	topology := &NetworkTopology{
		Networks: []TopologyNetwork{
			{Name: "dmz"},
			{Name: "internal", Internal: true},
		},
		Services: []TopologyService{
			{Name: "web", Image: "web:latest", Networks: []string{"internal"}, ExposeToPlayer: true},
			{Name: "jump", Image: "jump:latest", Networks: []string{"dmz", "internal"}},
		},
		EntryService: "web",
	}

	if err := topology.Validate(); err == nil {
		t.Fatal("expected validation error when entry is not on an exposed network")
	}
}

func TestNetworkTopologyValidate_OnlyEntryCanExposeToPlayer(t *testing.T) {
	topology := &NetworkTopology{
		Networks: []TopologyNetwork{{Name: "dmz", Exposed: true}},
		Services: []TopologyService{
			{Name: "web", Image: "web:latest", Networks: []string{"dmz"}, ExposeToPlayer: true},
			{Name: "db", Image: "mysql:8", Networks: []string{"dmz"}, ExposeToPlayer: true},
		},
		EntryService: "web",
	}

	if err := topology.Validate(); err == nil {
		t.Fatal("expected validation error when non-entry service is exposed to player")
	}
}

func TestNetworkTopologyValidate_EntryMustExposeToPlayer(t *testing.T) {
	topology := &NetworkTopology{
		Networks: []TopologyNetwork{{Name: "dmz", Exposed: true}},
		Services: []TopologyService{
			{Name: "web", Image: "web:latest", Networks: []string{"dmz"}},
		},
		EntryService: "web",
	}

	if err := topology.Validate(); err == nil {
		t.Fatal("expected validation error when entry is not exposed to player")
	}
}

func TestNetworkTopologyValidate_DuplicateServiceNetwork(t *testing.T) {
	topology := &NetworkTopology{
		Networks: []TopologyNetwork{{Name: "dmz", Exposed: true}},
		Services: []TopologyService{
			{Name: "web", Image: "web:latest", Networks: []string{"dmz", "dmz"}, ExposeToPlayer: true},
		},
		EntryService: "web",
	}

	if err := topology.Validate(); err == nil {
		t.Fatal("expected validation error for duplicate service network")
	}
}
