package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/services"
	"github.com/ZacharyZcR/STC/backend/internal/testutil"
)

func init() {
	gin.SetMode(gin.TestMode)
}

const jwtTestSecret = "test-jwt-secret-key"

func setupAuthTest(t *testing.T) (*gin.Engine, string) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "admin", []string{"*"})
	testutil.SeedTestUser(ctx, client, "testuser", "password123", role.ID)

	authSvc := services.NewAuthService(client, jwtTestSecret, nil)
	result, err := authSvc.Login(ctx, "testuser", "password123")
	if err != nil {
		t.Fatalf("login failed: %v", err)
	}

	r := gin.New()
	r.GET("/protected", JWTAuth(authSvc, client), func(c *gin.Context) {
		uid, _ := c.Get("user_id")
		c.JSON(200, gin.H{"user_id": uid})
	})

	return r, result.Token
}

func TestJWTAuth_ValidToken(t *testing.T) {
	r, token := setupAuthTest(t)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestJWTAuth_MissingHeader(t *testing.T) {
	r, _ := setupAuthTest(t)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != 401 {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestJWTAuth_InvalidToken(t *testing.T) {
	r, _ := setupAuthTest(t)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer invalid.token.here")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != 401 {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestJWTAuth_MalformedHeader(t *testing.T) {
	r, token := setupAuthTest(t)

	// Missing "Bearer" prefix
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != 401 {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestJWTAuth_WrongScheme(t *testing.T) {
	r, token := setupAuthTest(t)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Basic "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != 401 {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}
