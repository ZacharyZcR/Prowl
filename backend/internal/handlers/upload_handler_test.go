package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/middleware"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	"github.com/ZacharyZcR/STC/backend/internal/testutil"
)

func TestUploadServe_AllowsOwner(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "viewer", []string{"user:read"})
	owner := testutil.SeedTestUser(ctx, client, "owner", "password123", role.ID)

	cs, err := services.NewCasbinService(ctx, client)
	if err != nil {
		t.Fatalf("casbin init failed: %v", err)
	}
	middleware.SetCasbinService(cs)
	t.Cleanup(func() { middleware.SetCasbinService(nil) })

	authSvc := services.NewAuthService(client, handlerJWTSecret, nil)
	login, err := authSvc.Login(ctx, "owner", "password123")
	if err != nil {
		t.Fatalf("login failed: %v", err)
	}

	uploadSvc := services.NewUploadService(t.TempDir(), client)
	record, err := uploadSvc.SaveGeneratedFile(ctx, "users.csv", []byte("id,name\n1,owner\n"), "text/csv", owner.ID, owner.Username)
	if err != nil {
		t.Fatalf("save generated file: %v", err)
	}

	handler := NewUploadHandler(uploadSvc, authSvc)
	r := gin.New()
	r.GET("/uploads/*filepath", handler.Serve)

	req := httptest.NewRequest(http.MethodGet, "/uploads/"+record.Path+"?token="+login.Token, nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestUploadServe_BlocksOtherUserWithoutPermission(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "viewer", []string{"user:read"})
	owner := testutil.SeedTestUser(ctx, client, "owner", "password123", role.ID)
	testutil.SeedTestUser(ctx, client, "other", "password123", role.ID)

	cs, err := services.NewCasbinService(ctx, client)
	if err != nil {
		t.Fatalf("casbin init failed: %v", err)
	}
	middleware.SetCasbinService(cs)
	t.Cleanup(func() { middleware.SetCasbinService(nil) })

	authSvc := services.NewAuthService(client, handlerJWTSecret, nil)
	login, err := authSvc.Login(ctx, "other", "password123")
	if err != nil {
		t.Fatalf("login failed: %v", err)
	}

	uploadSvc := services.NewUploadService(t.TempDir(), client)
	record, err := uploadSvc.SaveGeneratedFile(ctx, "users.csv", []byte("id,name\n1,owner\n"), "text/csv", owner.ID, owner.Username)
	if err != nil {
		t.Fatalf("save generated file: %v", err)
	}

	handler := NewUploadHandler(uploadSvc, authSvc)
	r := gin.New()
	r.GET("/uploads/*filepath", handler.Serve)

	req := httptest.NewRequest(http.MethodGet, "/uploads/"+record.Path+"?token="+login.Token, nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", w.Code)
	}
}

func TestUploadServe_AllowsOtherUserWithReadPermission(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	ownerRole := testutil.SeedTestRole(ctx, client, "owner-role", []string{"upload:create"})
	readerRole := testutil.SeedTestRole(ctx, client, "reader-role", []string{"upload:read"})
	owner := testutil.SeedTestUser(ctx, client, "owner", "password123", ownerRole.ID)
	testutil.SeedTestUser(ctx, client, "reader", "password123", readerRole.ID)

	cs, err := services.NewCasbinService(ctx, client)
	if err != nil {
		t.Fatalf("casbin init failed: %v", err)
	}
	middleware.SetCasbinService(cs)
	t.Cleanup(func() { middleware.SetCasbinService(nil) })

	authSvc := services.NewAuthService(client, handlerJWTSecret, nil)
	login, err := authSvc.Login(ctx, "reader", "password123")
	if err != nil {
		t.Fatalf("login failed: %v", err)
	}

	uploadSvc := services.NewUploadService(t.TempDir(), client)
	record, err := uploadSvc.SaveGeneratedFile(ctx, "users.csv", []byte("id,name\n1,owner\n"), "text/csv", owner.ID, owner.Username)
	if err != nil {
		t.Fatalf("save generated file: %v", err)
	}

	handler := NewUploadHandler(uploadSvc, authSvc)
	r := gin.New()
	r.GET("/uploads/*filepath", handler.Serve)

	req := httptest.NewRequest(http.MethodGet, "/uploads/"+record.Path+"?token="+login.Token, nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}
