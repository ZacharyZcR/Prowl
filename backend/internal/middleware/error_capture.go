package middleware

import (
	"context"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/services"
)

func ErrorCapture(errorLogService *services.ErrorLogService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		status := c.Writer.Status()
		if status < 400 {
			return
		}

		errType := classifyError(status)

		var params map[string]interface{}
		if !isSensitivePath(c.Request.URL.Path) {
			params = extractParams(c)
		}

		userID := getUserID(c)

		recordCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		_ = errorLogService.Record(recordCtx, &services.RecordInput{
			Source:     "backend",
			ErrType:    errType,
			Message:    extractErrorMessage(c, status),
			URL:        c.Request.URL.String(),
			Method:     c.Request.Method,
			StatusCode: status,
			Params:     params,
			UserAgent:  c.Request.UserAgent(),
			RequestID:  c.GetString("request_id"),
			UserID:     userID,
		})
	}
}

func classifyError(status int) string {
	switch {
	case status == 400:
		return "validation_error"
	case status == 401:
		return "auth_error"
	case status == 403:
		return "permission_error"
	case status == 404:
		return "not_found"
	case status >= 500:
		return "server_error"
	default:
		return "client_error"
	}
}

func isSensitivePath(path string) bool {
	sensitive := []string{"/auth/login", "/auth/register", "/password"}
	for _, s := range sensitive {
		if strings.Contains(path, s) {
			return true
		}
	}
	return false
}

func extractParams(c *gin.Context) map[string]interface{} {
	params := make(map[string]interface{})
	for k, v := range c.Request.URL.Query() {
		if len(v) == 1 {
			params[k] = v[0]
		} else {
			params[k] = v
		}
	}
	if len(params) == 0 {
		return nil
	}
	return params
}

func extractErrorMessage(c *gin.Context, status int) string {
	// 尝试从 gin 的 Errors 中获取
	if len(c.Errors) > 0 {
		return c.Errors.Last().Error()
	}
	switch status {
	case 400:
		return "bad request"
	case 401:
		return "unauthorized"
	case 403:
		return "forbidden"
	case 404:
		return "not found"
	case 500:
		return "internal server error"
	default:
		return "error"
	}
}

func getUserID(c *gin.Context) int {
	if v, exists := c.Get("user_id"); exists {
		if id, ok := v.(int); ok {
			return id
		}
	}
	return 0
}
