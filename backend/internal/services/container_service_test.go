package services

import (
	"errors"
	"testing"
)

func TestIsPoolOverlapError(t *testing.T) {
	err := errors.New("Error response from daemon: invalid pool request: Pool overlaps with other one on this address space")
	if !isPoolOverlapError(err) {
		t.Fatal("expected pool overlap error to be detected")
	}
}

func TestIsPoolOverlapErrorFalse(t *testing.T) {
	if isPoolOverlapError(errors.New("permission denied")) {
		t.Fatal("did not expect non-overlap error to match")
	}
	if isPoolOverlapError(nil) {
		t.Fatal("did not expect nil error to match")
	}
}
