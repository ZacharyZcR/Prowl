package middleware

import (
	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

var casbinSvc *services.CasbinService

// SetCasbinService sets the package-level CasbinService used by RequirePermission.
// Must be called before any request is served.
func SetCasbinService(cs *services.CasbinService) {
	casbinSvc = cs
}

// GetCasbinService returns the package-level CasbinService.
func GetCasbinService() *services.CasbinService {
	return casbinSvc
}

// RequirePermission checks that the authenticated user's role has all
// of the specified permissions (e.g. "user:read", "project:delete").
// The role name is read from the Gin context key "role", set by JWTAuth
// or APIKeyAuth middleware.
func RequirePermission(permissions ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			response.AppError(c, apperr.ErrForbidden.WithMessage("no role found"))
			c.Abort()
			return
		}

		roleName, ok := role.(string)
		if !ok || roleName == "" {
			response.AppError(c, apperr.ErrForbidden)
			c.Abort()
			return
		}

		if !casbinSvc.CheckPermissions(roleName, permissions...) {
			response.AppError(c, apperr.ErrForbidden.WithMessage("insufficient permissions"))
			c.Abort()
			return
		}

		c.Next()
	}
}
