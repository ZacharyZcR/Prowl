package errors

import (
	"fmt"
	"strings"
	"testing"
)

func TestAppError_Error(t *testing.T) {
	err := &AppError{Code: 40000, Message: "bad request", HTTPStatus: 400}
	if err.Error() != "bad request" {
		t.Fatalf("expected 'bad request', got '%s'", err.Error())
	}
}

func TestAppError_WithMessage(t *testing.T) {
	original := ErrBadRequest
	derived := original.WithMessage("field is missing")

	if derived.Message != "field is missing" {
		t.Fatalf("expected 'field is missing', got '%s'", derived.Message)
	}
	if derived.Code != original.Code {
		t.Fatalf("expected code %d, got %d", original.Code, derived.Code)
	}
	if derived.HTTPStatus != original.HTTPStatus {
		t.Fatalf("expected http status %d, got %d", original.HTTPStatus, derived.HTTPStatus)
	}
	// Original should be unchanged
	if original.Message != "bad request" {
		t.Fatal("original error was mutated")
	}
}

func TestNew(t *testing.T) {
	err := New(42000, 422, "validation failed")
	if err.Code != 42000 {
		t.Fatalf("expected code 42000, got %d", err.Code)
	}
	if err.HTTPStatus != 422 {
		t.Fatalf("expected http 422, got %d", err.HTTPStatus)
	}
	if err.Message != "validation failed" {
		t.Fatalf("expected 'validation failed', got '%s'", err.Message)
	}
}

func TestWrap(t *testing.T) {
	inner := fmt.Errorf("connection refused")
	wrapped := Wrap(ErrInternal, inner)

	if !strings.Contains(wrapped.Message, "connection refused") {
		t.Fatalf("expected wrapped message to contain inner error, got '%s'", wrapped.Message)
	}
	if wrapped.Code != ErrInternal.Code {
		t.Fatalf("expected code %d, got %d", ErrInternal.Code, wrapped.Code)
	}
}

func TestPredefinedErrors(t *testing.T) {
	tests := []struct {
		name       string
		err        *AppError
		httpStatus int
	}{
		{"Unauthorized", ErrUnauthorized, 401},
		{"Forbidden", ErrForbidden, 403},
		{"NotFound", ErrNotFound, 404},
		{"BadRequest", ErrBadRequest, 400},
		{"ServiceUnavailable", ErrServiceUnavailable, 503},
		{"Internal", ErrInternal, 500},
		{"InvalidCredentials", ErrInvalidCredentials, 401},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.err.HTTPStatus != tt.httpStatus {
				t.Fatalf("expected http %d, got %d", tt.httpStatus, tt.err.HTTPStatus)
			}
			if tt.err.Error() == "" {
				t.Fatal("error message should not be empty")
			}
		})
	}
}
