package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/middleware"
	"github.com/ZacharyZcR/STC/backend/internal/server"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	"github.com/ZacharyZcR/STC/backend/internal/testutil"
)

const handlerJWTSecret = "test-jwt-secret-key"

func TestSystemLogStream_RequiresPermission(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "viewer", []string{"user:read"})
	testutil.SeedTestUser(ctx, client, "tester", "password123", role.ID)

	cs, err := services.NewCasbinService(ctx, client)
	if err != nil {
		t.Fatalf("casbin init failed: %v", err)
	}
	middleware.SetCasbinService(cs)
	t.Cleanup(func() { middleware.SetCasbinService(nil) })

	authSvc := services.NewAuthService(client, handlerJWTSecret, nil)
	login, err := authSvc.Login(ctx, "tester", "password123")
	if err != nil {
		t.Fatalf("login failed: %v", err)
	}

	handler := NewSystemLogHandler(authSvc)
	r := gin.New()
	r.GET("/stream", handler.Stream)

	req := httptest.NewRequest(http.MethodGet, "/stream?token="+login.Token, nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", w.Code)
	}
}

func TestOnlineUsers_RequiresAuthentication(t *testing.T) {
	handler := NewWSHandler(server.NewHub(), services.NewAuthService(testutil.NewTestClient(t), handlerJWTSecret, nil), []string{"http://localhost:35173"})
	r := gin.New()
	r.GET("/online", handler.OnlineUsers)

	req := httptest.NewRequest(http.MethodGet, "/online", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}
