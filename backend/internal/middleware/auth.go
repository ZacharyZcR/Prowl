package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

func JWTAuth(authService *services.AuthService, client *ent.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, exists := c.Get("auth_method"); exists {
			c.Next()
			return
		}

		header := c.GetHeader("Authorization")
		if header == "" {
			response.AppError(c, apperr.ErrUnauthorized.WithMessage("missing authorization header"))
			c.Abort()
			return
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			response.AppError(c, apperr.ErrUnauthorized.WithMessage("invalid authorization format"))
			c.Abort()
			return
		}

		tokenStr := parts[1]

		claims, err := authService.ValidateAccessToken(c.Request.Context(), tokenStr)
		if err != nil {
			response.AppError(c, apperr.ErrUnauthorized.WithMessage("invalid token"))
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Set("token", tokenStr)

		c.Next()
	}
}
