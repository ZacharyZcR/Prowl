package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

var (
	Version   = "dev"
	BuildTime = "unknown"
	GitCommit = "unknown"
)

type HealthHandler struct {
	client *ent.Client
	rdb    *redis.Client
}

func NewHealthHandler(client *ent.Client, rdb *redis.Client) *HealthHandler {
	return &HealthHandler{client: client, rdb: rdb}
}

// Health godoc
// @Summary 健康检查
// @Description 返回服务状态和版本信息
// @Tags system
// @Produce json
// @Success 200 {object} response.Response
// @Router /health [get]
func (h *HealthHandler) Health(c *gin.Context) {
	response.Success(c, gin.H{
		"status":     "ok",
		"version":    Version,
		"build_time": BuildTime,
		"git_commit": GitCommit,
	})
}

// DeepHealth godoc
// @Summary 深度健康检查
// @Description 验证 DB 和 Redis 连通性
// @Tags system
// @Produce json
// @Success 200 {object} response.Response
// @Failure 503 {object} response.Response
// @Router /health/deep [get]
func (h *HealthHandler) DeepHealth(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	status := http.StatusOK
	components := make(map[string]string)

	// 检查数据库
	if _, err := h.client.User.Query().Limit(1).Count(ctx); err != nil {
		components["database"] = "unhealthy: " + err.Error()
		status = http.StatusServiceUnavailable
	} else {
		components["database"] = "ok"
	}

	// 检查 Redis
	if err := h.rdb.Ping(ctx).Err(); err != nil {
		components["redis"] = "unhealthy: " + err.Error()
		status = http.StatusServiceUnavailable
	} else {
		components["redis"] = "ok"
	}

	overall := "ok"
	if status != http.StatusOK {
		overall = "degraded"
	}

	c.JSON(status, gin.H{
		"status":     overall,
		"version":    Version,
		"components": components,
	})
}

// Ping godoc
// @Summary 存活检测
// @Description 返回 pong，用于简单存活探针
// @Tags system
// @Produce plain
// @Success 200 {string} string "pong"
// @Router /ping [get]
func (h *HealthHandler) Ping(c *gin.Context) {
	c.String(http.StatusOK, "pong")
}
