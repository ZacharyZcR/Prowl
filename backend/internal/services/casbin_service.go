package services

import (
	"context"
	"strings"
	"sync"

	"github.com/casbin/casbin/v2"
	casbinmodel "github.com/casbin/casbin/v2/model"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/user"
)

const rbacModel = `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = r.sub == p.sub && (p.obj == "*" || r.obj == p.obj) && (p.act == "*" || r.act == p.act)
`

// CasbinService wraps a Casbin enforcer backed by the Role table.
type CasbinService struct {
	enforcer *casbin.Enforcer
	client   *ent.Client
	mu       sync.RWMutex
}

// NewCasbinService creates a CasbinService and loads policies from the database.
func NewCasbinService(ctx context.Context, client *ent.Client) (*CasbinService, error) {
	m, err := casbinmodel.NewModelFromString(rbacModel)
	if err != nil {
		return nil, err
	}

	e, err := casbin.NewEnforcer(m)
	if err != nil {
		return nil, err
	}

	s := &CasbinService{enforcer: e, client: client}
	if err := s.LoadPolicies(ctx); err != nil {
		return nil, err
	}
	return s, nil
}

// LoadPolicies reloads all policies from the Role table.
// Call this after role permissions are modified.
func (s *CasbinService) LoadPolicies(ctx context.Context) error {
	roles, err := s.client.Role.Query().All(ctx)
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.enforcer.ClearPolicy()

	for _, role := range roles {
		for _, perm := range role.Permissions {
			obj, act := parsePerm(perm)
			s.enforcer.AddPolicy(role.Name, obj, act)
		}
	}

	return nil
}

// CheckPermission checks if a role has a "resource:action" permission.
func (s *CasbinService) CheckPermission(role, permission string) bool {
	obj, act := parsePerm(permission)
	s.mu.RLock()
	defer s.mu.RUnlock()
	ok, _ := s.enforcer.Enforce(role, obj, act)
	return ok
}

// CheckPermissions checks if a role has ALL specified permissions.
func (s *CasbinService) CheckPermissions(role string, permissions ...string) bool {
	for _, perm := range permissions {
		if !s.CheckPermission(role, perm) {
			return false
		}
	}
	return true
}

// CheckUserPermissions looks up the user's role and checks permissions.
func (s *CasbinService) CheckUserPermissions(ctx context.Context, userID int, permissions ...string) (bool, error) {
	u, err := s.client.User.Query().Where(user.ID(userID)).WithRole().Only(ctx)
	if err != nil {
		return false, err
	}

	roleName := ""
	if u.Edges.Role != nil {
		roleName = u.Edges.Role.Name
	}
	if roleName == "" {
		return false, nil
	}

	return s.CheckPermissions(roleName, permissions...), nil
}

// parsePerm splits "resource:action" into (obj, act).
// "*" becomes ("*", "*"), "project:*" becomes ("project", "*").
func parsePerm(perm string) (string, string) {
	if perm == "*" {
		return "*", "*"
	}
	parts := strings.SplitN(perm, ":", 2)
	if len(parts) != 2 {
		return perm, "*"
	}
	return parts[0], parts[1]
}
