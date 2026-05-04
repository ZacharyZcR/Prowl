package handlers

import (
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/middleware"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

func extractRequestToken(c *gin.Context) string {
	if header := c.GetHeader("Authorization"); header != "" {
		parts := strings.SplitN(header, " ", 2)
		if len(parts) == 2 && parts[0] == "Bearer" {
			return strings.TrimSpace(parts[1])
		}
	}
	return strings.TrimSpace(c.Query("token"))
}

func authenticateRequest(c *gin.Context, authService *services.AuthService) (*models.UserClaims, bool) {
	token := extractRequestToken(c)
	if token == "" {
		response.Error(c, 401, "missing token")
		return nil, false
	}

	claims, err := authService.ValidateAccessToken(c.Request.Context(), token)
	if err != nil {
		response.Error(c, 401, "invalid token")
		return nil, false
	}

	return claims, true
}

func requireTokenPermissions(c *gin.Context, _ *services.AuthService, claims *models.UserClaims, permissions ...string) bool {
	cs := middleware.GetCasbinService()
	if cs == nil || !cs.CheckPermissions(claims.Role, permissions...) {
		response.AppError(c, apperr.ErrForbidden.WithMessage("insufficient permissions"))
		return false
	}
	return true
}
