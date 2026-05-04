package services

import (
	"context"
	"testing"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/testutil"
)

func TestUserService_Create(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "user", []string{"read"})

	svc := NewUserService(client)
	u, err := svc.Create(ctx, &models.CreateUserRequest{
		Username: "newuser",
		Password: "password123",
		Email:    "new@test.local",
		RoleID:   role.ID,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if u.Username != "newuser" {
		t.Fatalf("expected username newuser, got %s", u.Username)
	}
}

func TestUserService_Create_DuplicateUsername(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "user", []string{"read"})
	testutil.SeedTestUser(ctx, client, "existing", "pass", role.ID)

	svc := NewUserService(client)
	_, err := svc.Create(ctx, &models.CreateUserRequest{
		Username: "existing",
		Password: "password123",
		Email:    "other@test.local",
		RoleID:   role.ID,
	})
	if err == nil {
		t.Fatal("expected error for duplicate username")
	}
}

func TestUserService_List(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "user", []string{"read"})
	testutil.SeedTestUser(ctx, client, "user1", "pass", role.ID)
	testutil.SeedTestUser(ctx, client, "user2", "pass", role.ID)
	testutil.SeedTestUser(ctx, client, "user3", "pass", role.ID)

	svc := NewUserService(client)
	result, err := svc.List(ctx, &models.ListQuery{Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Total != 3 {
		t.Fatalf("expected 3 users, got %d", result.Total)
	}
}

func TestUserService_List_Search(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "user", []string{"read"})
	testutil.SeedTestUser(ctx, client, "alice", "pass", role.ID)
	testutil.SeedTestUser(ctx, client, "bob", "pass", role.ID)
	testutil.SeedTestUser(ctx, client, "charlie", "pass", role.ID)

	svc := NewUserService(client)
	result, err := svc.List(ctx, &models.ListQuery{Page: 1, PageSize: 10, Search: "ali"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Total != 1 {
		t.Fatalf("expected 1 user matching 'ali', got %d", result.Total)
	}
}

func TestUserService_GetByID(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "user", []string{"read"})
	u := testutil.SeedTestUser(ctx, client, "testuser", "pass", role.ID)

	svc := NewUserService(client)
	found, err := svc.GetByID(ctx, u.ID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if found.Username != "testuser" {
		t.Fatalf("expected username testuser, got %s", found.Username)
	}
}

func TestUserService_GetByID_NotFound(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()

	svc := NewUserService(client)
	_, err := svc.GetByID(ctx, 99999)
	if err == nil {
		t.Fatal("expected error for nonexistent user")
	}
}

func TestUserService_Update(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "user", []string{"read"})
	u := testutil.SeedTestUser(ctx, client, "testuser", "pass", role.ID)

	svc := NewUserService(client)
	newEmail := "updated@test.local"
	updated, err := svc.Update(ctx, u.ID, &models.UpdateUserRequest{
		Email: &newEmail,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if updated.Email != "updated@test.local" {
		t.Fatalf("expected updated email, got %s", updated.Email)
	}
}

func TestUserService_Delete(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "user", []string{"read"})
	u := testutil.SeedTestUser(ctx, client, "target", "pass", role.ID)
	caller := testutil.SeedTestUser(ctx, client, "caller", "pass", role.ID)

	svc := NewUserService(client)
	err := svc.Delete(ctx, u.ID, caller.ID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	_, err = svc.GetByID(ctx, u.ID)
	if err == nil {
		t.Fatal("expected error after deletion")
	}
}

func TestUserService_Delete_Self(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "user", []string{"read"})
	u := testutil.SeedTestUser(ctx, client, "selfdelete", "pass", role.ID)

	svc := NewUserService(client)
	err := svc.Delete(ctx, u.ID, u.ID)
	if err == nil {
		t.Fatal("expected error when deleting self")
	}
}

func TestUserService_Delete_LastAdmin(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	adminRole := testutil.SeedTestRole(ctx, client, "admin", []string{"*"})
	userRole := testutil.SeedTestRole(ctx, client, "user", []string{"read"})
	admin := testutil.SeedTestUser(ctx, client, "admin", "pass", adminRole.ID)
	caller := testutil.SeedTestUser(ctx, client, "caller", "pass", userRole.ID)

	svc := NewUserService(client)
	err := svc.Delete(ctx, admin.ID, caller.ID)
	if err == nil {
		t.Fatal("expected error when deleting last admin")
	}
}

func TestUserService_ChangePassword(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "user", []string{"read"})
	u := testutil.SeedTestUser(ctx, client, "testuser", "oldpass", role.ID)

	svc := NewUserService(client)
	err := svc.ChangePassword(ctx, u.ID, "oldpass", "newpass123")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Verify new password works via AuthService
	authSvc := NewAuthService(client, testSecret, nil)
	_, err = authSvc.Login(ctx, "testuser", "newpass123")
	if err != nil {
		t.Fatalf("expected login with new password to succeed, got %v", err)
	}
}

func TestUserService_ChangePassword_WrongOld(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "user", []string{"read"})
	u := testutil.SeedTestUser(ctx, client, "testuser", "correct", role.ID)

	svc := NewUserService(client)
	err := svc.ChangePassword(ctx, u.ID, "wrong", "newpass123")
	if err == nil {
		t.Fatal("expected error for wrong old password")
	}
}
