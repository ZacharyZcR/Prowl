package services

import (
	"context"
	"testing"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/testutil"
)

func TestRoleService_Create(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()

	svc := NewRoleService(client)
	r, err := svc.Create(ctx, &models.CreateRoleRequest{
		Name:        "editor",
		Description: "can edit things",
		Permissions: []string{"project:read", "project:write"},
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if r.Name != "editor" {
		t.Fatalf("expected name editor, got %s", r.Name)
	}
	if len(r.Permissions) != 2 {
		t.Fatalf("expected 2 permissions, got %d", len(r.Permissions))
	}
}

func TestRoleService_Create_Duplicate(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()

	svc := NewRoleService(client)
	_, err := svc.Create(ctx, &models.CreateRoleRequest{
		Name:        "admin",
		Description: "admin",
		Permissions: []string{"*"},
	})
	if err != nil {
		t.Fatalf("first create should succeed: %v", err)
	}

	_, err = svc.Create(ctx, &models.CreateRoleRequest{
		Name:        "admin",
		Description: "dup",
		Permissions: []string{"*"},
	})
	if err == nil {
		t.Fatal("expected error for duplicate role name")
	}
}

func TestRoleService_List(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()

	svc := NewRoleService(client)
	svc.Create(ctx, &models.CreateRoleRequest{Name: "role1", Permissions: []string{"a"}})
	svc.Create(ctx, &models.CreateRoleRequest{Name: "role2", Permissions: []string{"b"}})

	roles, err := svc.List(ctx)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(roles) != 2 {
		t.Fatalf("expected 2 roles, got %d", len(roles))
	}
}

func TestRoleService_Update(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()

	svc := NewRoleService(client)
	r, _ := svc.Create(ctx, &models.CreateRoleRequest{
		Name:        "viewer",
		Description: "read only",
		Permissions: []string{"read"},
	})

	newName := "reviewer"
	updated, err := svc.Update(ctx, r.ID, &models.UpdateRoleRequest{Name: &newName})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if updated.Name != "reviewer" {
		t.Fatalf("expected name reviewer, got %s", updated.Name)
	}
}

func TestRoleService_Delete(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()

	svc := NewRoleService(client)
	r, _ := svc.Create(ctx, &models.CreateRoleRequest{
		Name:        "temporary",
		Permissions: []string{"temp"},
	})

	err := svc.Delete(ctx, r.ID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	_, err = svc.GetByID(ctx, r.ID)
	if err == nil {
		t.Fatal("expected error after deletion")
	}
}

func TestRoleService_Delete_WithUsers(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "occupied", []string{"read"})
	testutil.SeedTestUser(ctx, client, "user1", "pass", role.ID)

	svc := NewRoleService(client)
	err := svc.Delete(ctx, role.ID)
	if err == nil {
		t.Fatal("expected error when deleting role with assigned users")
	}
}
