package services

import (
	"testing"

	"github.com/ZacharyZcR/STC/backend/internal/models"
)

func TestStackID(t *testing.T) {
	got := StackID(12, 34, 56)
	want := "range_c12_comp34_t56"
	if got != want {
		t.Fatalf("expected %s, got %s", want, got)
	}
}

func TestStackEnvExpandsFlag(t *testing.T) {
	env := stackEnv("flag{demo}", map[string]string{
		"A": "{{FLAG}}",
		"B": "prefix-${FLAG}",
	})

	if env["FLAG"] != "flag{demo}" {
		t.Fatalf("expected FLAG to be set, got %q", env["FLAG"])
	}
	if env["A"] != "flag{demo}" {
		t.Fatalf("expected template expansion, got %q", env["A"])
	}
	if env["B"] != "prefix-flag{demo}" {
		t.Fatalf("expected shell-style expansion, got %q", env["B"])
	}
}

func TestStackNetworkLabelsIncludesAccessPolicy(t *testing.T) {
	labels := stackNetworkLabels(map[string]string{"base": "1"}, "stack-1", models.TopologyNetwork{
		Name:    "dmz",
		Exposed: true,
	})

	if labels["base"] != "1" {
		t.Fatalf("expected base label to be preserved")
	}
	if labels["stack-resource-type"] != "network" || labels["stack-resource-name"] != "dmz" {
		t.Fatalf("expected stack network labels, got %#v", labels)
	}
	if labels["topology-network-exposed"] != "true" {
		t.Fatalf("expected exposed policy label, got %#v", labels)
	}
	if labels["topology-network-internal"] != "false" {
		t.Fatalf("expected internal policy label, got %#v", labels)
	}
}

func TestStackNetworkLabelsIncludesRequestedSubnet(t *testing.T) {
	labels := stackNetworkLabels(nil, "stack-1", models.TopologyNetwork{
		Name:   "dmz",
		Subnet: "10.77.1.0/24",
	})

	if labels["topology-network-requested-subnet"] != "10.77.1.0/24" {
		t.Fatalf("expected requested subnet label, got %#v", labels)
	}
}

func TestExposedPortsForServiceDefaultsToHTTP(t *testing.T) {
	got := exposedPortsForService(models.TopologyService{Name: "web"})
	if len(got) != 1 || got[0] != "80" {
		t.Fatalf("expected default HTTP port, got %#v", got)
	}

	got = exposedPortsForService(models.TopologyService{Name: "web", Ports: []string{"8080", "9000"}})
	if len(got) != 2 || got[0] != "8080" || got[1] != "9000" {
		t.Fatalf("expected configured ports, got %#v", got)
	}
}
