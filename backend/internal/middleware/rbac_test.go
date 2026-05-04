package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/casbin/casbin/v2"
	casbinmodel "github.com/casbin/casbin/v2/model"
	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/services"
	"github.com/ZacharyZcR/STC/backend/internal/testutil"
)

func setupCasbin(t *testing.T, roles map[string][]string) {
	t.Helper()
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	for name, perms := range roles {
		testutil.SeedTestRole(ctx, client, name, perms)
	}
	cs, err := services.NewCasbinService(ctx, client)
	if err != nil {
		t.Fatalf("failed to create casbin service: %v", err)
	}
	SetCasbinService(cs)
	t.Cleanup(func() { SetCasbinService(nil) })
}

func newRBACRouter(roleName string, required ...string) *gin.Engine {
	r := gin.New()
	r.GET("/test", func(c *gin.Context) {
		c.Set("role", roleName)
		c.Next()
	}, RequirePermission(required...), func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})
	return r
}

func TestRequirePermission_Allowed(t *testing.T) {
	setupCasbin(t, map[string][]string{
		"editor": {"project:read", "project:write"},
	})
	r := newRBACRouter("editor", "project:read")

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestRequirePermission_Denied(t *testing.T) {
	setupCasbin(t, map[string][]string{
		"viewer": {"project:read"},
	})
	r := newRBACRouter("viewer", "project:delete")

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != 403 {
		t.Fatalf("expected 403, got %d", w.Code)
	}
}

func TestRequirePermission_AdminWildcard(t *testing.T) {
	setupCasbin(t, map[string][]string{
		"admin": {"*"},
	})
	r := newRBACRouter("admin", "project:delete", "user:write")

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200 for admin wildcard, got %d", w.Code)
	}
}

func TestRequirePermission_PrefixWildcard(t *testing.T) {
	setupCasbin(t, map[string][]string{
		"editor": {"project:*"},
	})
	r := newRBACRouter("editor", "project:read")

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200 for prefix wildcard, got %d: %s", w.Code, w.Body.String())
	}
}

func TestRequirePermission_NoRole(t *testing.T) {
	// Use a minimal enforcer so the test doesn't panic
	m, _ := casbinmodel.NewModelFromString(`
[request_definition]
r = sub, obj, act
[policy_definition]
p = sub, obj, act
[policy_effect]
e = some(where (p.eft == allow))
[matchers]
m = r.sub == p.sub && r.obj == p.obj && r.act == p.act
`)
	e, _ := casbin.NewEnforcer(m)
	_ = e

	setupCasbin(t, map[string][]string{})

	r := gin.New()
	r.GET("/test", func(c *gin.Context) {
		// Don't set role
		c.Next()
	}, RequirePermission("project:read"), func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != 403 {
		t.Fatalf("expected 403, got %d", w.Code)
	}
}

func TestRequirePermission_MultipleRequired(t *testing.T) {
	setupCasbin(t, map[string][]string{
		"editor": {"project:read", "user:read"},
	})
	r := newRBACRouter("editor", "project:read", "user:read")

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestRequirePermission_MultipleRequired_PartialMatch(t *testing.T) {
	setupCasbin(t, map[string][]string{
		"viewer": {"project:read"},
	})
	r := newRBACRouter("viewer", "project:read", "user:read")

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != 403 {
		t.Fatalf("expected 403 for partial match, got %d", w.Code)
	}
}
