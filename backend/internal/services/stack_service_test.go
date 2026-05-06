package services

import "testing"

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
