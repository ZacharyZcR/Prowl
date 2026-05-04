package middleware

import (
	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/user"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

func APIKeyAuth(apiKeyService *services.APIKeyService, client *ent.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.GetHeader("X-API-Key")
		if key == "" {
			key = c.Query("api_key")
		}
		if key == "" {
			c.Next()
			return
		}

		record, err := apiKeyService.Validate(c.Request.Context(), key)
		if err != nil {
			response.AppError(c, apperr.ErrUnauthorized.WithMessage("invalid api key"))
			c.Abort()
			return
		}

		c.Set("user_id", record.UserID)
		c.Set("auth_method", "api_key")

		// 查用户的 role 和 permissions
		u, dbErr := client.User.Query().Where(user.ID(record.UserID)).WithRole().Only(c.Request.Context())
		if dbErr != nil {
			response.AppError(c, apperr.ErrUnauthorized.WithMessage("user not found"))
			c.Abort()
			return
		}

		c.Set("username", u.Username)
		if u.Edges.Role != nil {
			c.Set("role", u.Edges.Role.Name)
		} else {
			c.Set("role", "")
		}

		c.Next()
	}
}
