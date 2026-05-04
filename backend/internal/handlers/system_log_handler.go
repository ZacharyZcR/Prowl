package handlers

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/services"
	"github.com/ZacharyZcR/STC/backend/pkg/logger"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type SystemLogHandler struct {
	authService *services.AuthService
}

func NewSystemLogHandler(authService *services.AuthService) *SystemLogHandler {
	return &SystemLogHandler{authService: authService}
}

// Recent godoc
// @Summary 获取最近系统日志
// @Tags system-logs
// @Param level query string false "日志级别"
// @Param keyword query string false "关键词"
// @Param limit query int false "条数限制" default(100)
// @Produce json
// @Router /system-logs [get]
func (h *SystemLogHandler) Recent(c *gin.Context) {
	level := c.Query("level")
	keyword := c.Query("keyword")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))

	entries := logger.GlobalBuffer.Search(level, keyword, limit)
	response.Success(c, entries)
}

// Stream godoc
// @Summary SSE 实时系统日志流
// @Tags system-logs
// @Param token query string true "JWT Token"
// @Produce text/event-stream
// @Router /system-logs/stream [get]
func (h *SystemLogHandler) Stream(c *gin.Context) {
	claims, ok := authenticateRequest(c, h.authService)
	if !ok {
		return
	}
	if !requireTokenPermissions(c, h.authService, claims, "system:settings") {
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	ch, unsub := logger.GlobalBuffer.Subscribe()
	defer unsub()

	flusher := c.Writer

	// 发送初始心跳让 EventSource 触发 onopen
	fmt.Fprintf(flusher, ": connected\n\n")
	flusher.Flush()

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case entry, open := <-ch:
			if !open {
				return
			}
			data, _ := json.Marshal(entry)
			fmt.Fprintf(flusher, "data: %s\n\n", data)
			flusher.Flush()
		case <-ticker.C:
			fmt.Fprintf(flusher, ": keepalive\n\n")
			flusher.Flush()
		case <-c.Request.Context().Done():
			return
		}
	}
}
