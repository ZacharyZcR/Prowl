package services

import (
	"context"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/testutil"
)

const testSecret = "test-jwt-secret-key"

func TestAuthService_Login_Success(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "admin", []string{"*"})
	testutil.SeedTestUser(ctx, client, "testuser", "password123", role.ID)

	svc := NewAuthService(client, testSecret, nil)
	result, err := svc.Login(ctx, "testuser", "password123")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Token == "" {
		t.Fatal("expected non-empty token")
	}
	if result.User.Username != "testuser" {
		t.Fatalf("expected username testuser, got %s", result.User.Username)
	}
}

func TestAuthService_Login_WrongPassword(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "admin", []string{"*"})
	testutil.SeedTestUser(ctx, client, "testuser", "password123", role.ID)

	svc := NewAuthService(client, testSecret, nil)
	_, err := svc.Login(ctx, "testuser", "wrongpassword")
	if err == nil {
		t.Fatal("expected error for wrong password")
	}
}

func TestAuthService_Login_UserNotFound(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()

	svc := NewAuthService(client, testSecret, nil)
	_, err := svc.Login(ctx, "nonexistent", "password123")
	if err == nil {
		t.Fatal("expected error for nonexistent user")
	}
}

func TestAuthService_ValidateToken(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "admin", []string{"*"})
	testutil.SeedTestUser(ctx, client, "testuser", "password123", role.ID)

	svc := NewAuthService(client, testSecret, nil)
	result, err := svc.Login(ctx, "testuser", "password123")
	if err != nil {
		t.Fatalf("login failed: %v", err)
	}

	claims, err := svc.ValidateToken(result.Token)
	if err != nil {
		t.Fatalf("expected valid token, got %v", err)
	}
	if claims.Username != "testuser" {
		t.Fatalf("expected username testuser, got %s", claims.Username)
	}
	if claims.Role != "admin" {
		t.Fatalf("expected role admin, got %s", claims.Role)
	}
}

func TestAuthService_ValidateToken_Invalid(t *testing.T) {
	client := testutil.NewTestClient(t)
	svc := NewAuthService(client, testSecret, nil)

	_, err := svc.ValidateToken("invalid.token.string")
	if err == nil {
		t.Fatal("expected error for invalid token")
	}
}

func TestAuthService_ValidateToken_Expired(t *testing.T) {
	client := testutil.NewTestClient(t)
	svc := NewAuthService(client, testSecret, nil)

	// Manually create an expired token
	now := time.Now().Add(-48 * time.Hour)
	claims := models.UserClaims{
		UserID:   1,
		Username: "expired",
		Role:     "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(1 * time.Hour)), // expired 23h ago
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    "stc",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, _ := token.SignedString([]byte(testSecret))

	_, err := svc.ValidateToken(tokenStr)
	if err == nil {
		t.Fatal("expected error for expired token")
	}
}

func TestAuthService_ValidateToken_WrongSecret(t *testing.T) {
	client := testutil.NewTestClient(t)
	svc := NewAuthService(client, testSecret, nil)

	// Sign with a different secret
	now := time.Now()
	claims := models.UserClaims{
		UserID:   1,
		Username: "test",
		Role:     "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    "stc",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, _ := token.SignedString([]byte("wrong-secret"))

	_, err := svc.ValidateToken(tokenStr)
	if err == nil {
		t.Fatal("expected error for token signed with wrong secret")
	}
}

func TestAuthService_ValidateAccessToken_MissingToken(t *testing.T) {
	client := testutil.NewTestClient(t)
	svc := NewAuthService(client, testSecret, nil)

	if _, err := svc.ValidateAccessToken(context.Background(), ""); err == nil {
		t.Fatal("expected error for missing access token")
	}
}

func TestCasbinService_CheckPermissions(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	testutil.SeedTestRole(ctx, client, "editor", []string{"project:*", "user:read"})

	cs, err := NewCasbinService(ctx, client)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if !cs.CheckPermission("editor", "project:update") {
		t.Fatal("expected wildcard project permission to match")
	}

	if cs.CheckPermission("editor", "user:delete") {
		t.Fatal("expected unmatched permission to be denied")
	}
}

func TestCasbinService_AdminWildcard(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	testutil.SeedTestRole(ctx, client, "admin", []string{"*"})

	cs, err := NewCasbinService(ctx, client)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if !cs.CheckPermission("admin", "user:delete") {
		t.Fatal("expected admin wildcard to match any permission")
	}
	if !cs.CheckPermission("admin", "system:settings") {
		t.Fatal("expected admin wildcard to match system:settings")
	}
}
