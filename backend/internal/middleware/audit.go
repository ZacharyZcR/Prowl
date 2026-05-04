package middleware

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/services"
)

func AuditLog(activityService *services.ActivityService) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "GET" || c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}

		c.Next()

		status := c.Writer.Status()
		if status < 200 || status >= 300 {
			return
		}

		userID, _ := c.Get("user_id")
		username, _ := c.Get("username")

		uid, _ := userID.(int)
		uname, _ := username.(string)
		if uid == 0 {
			return
		}

		action, resourceType := deriveActionFromPath(c.Request.Method, c.FullPath())

		recordCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		_ = activityService.LogEntry(recordCtx, &services.LogInput{
			UserID:       uid,
			Username:     uname,
			Action:       action,
			ResourceType: resourceType,
			Detail:       fmt.Sprintf("%s %s → %d", c.Request.Method, c.Request.URL.Path, status),
			IP:           c.ClientIP(),
			UserAgent:    c.Request.UserAgent(),
			Method:       c.Request.Method,
			Path:         c.Request.URL.Path,
			StatusCode:   status,
		})
	}
}

func deriveActionFromPath(method, fullPath string) (action, resourceType string) {
	parts := strings.Split(strings.TrimPrefix(fullPath, "/api/v1/"), "/")
	if len(parts) > 0 {
		resourceType = parts[0]
	}

	switch method {
	case "POST":
		action = resourceType + ".create"
	case "PUT":
		action = resourceType + ".update"
	case "DELETE":
		action = resourceType + ".delete"
	default:
		action = resourceType + "." + strings.ToLower(method)
	}

	return action, resourceType
}
