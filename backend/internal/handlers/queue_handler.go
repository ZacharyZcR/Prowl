package handlers

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/queue"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type QueueHandler struct {
	queue       *queue.Queue
	authService *services.AuthService
}

func NewQueueHandler(q *queue.Queue, authService *services.AuthService) *QueueHandler {
	return &QueueHandler{queue: q, authService: authService}
}

// Stats godoc
// @Summary 队列统计
// @Description 返回任务队列统计信息
// @Tags queue
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response{data=queue.QueueStats}
// @Router /queue/stats [get]
func (h *QueueHandler) Stats(c *gin.Context) {
	response.Success(c, h.queue.Stats())
}

// ListTasks godoc
// @Summary 最近任务列表
// @Description 返回最近的任务列表
// @Tags queue
// @Produce json
// @Security BearerAuth
// @Param limit query int false "数量限制" default(20)
// @Success 200 {object} response.Response
// @Router /queue/tasks [get]
func (h *QueueHandler) ListTasks(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	response.Success(c, h.queue.ListRecent(limit))
}

// Enqueue godoc
// @Summary 入队示例任务
// @Description 创建一个 demo 任务（sleep 5s 模拟工作）
// @Tags queue
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response
// @Router /queue/tasks [post]
func (h *QueueHandler) Enqueue(c *gin.Context) {
	id, err := h.queue.TryEnqueue(queue.TypeDemo, queue.DemoPayload{})
	if err != nil {
		response.AppError(c, apperr.ErrServiceUnavailable.WithMessage("failed to enqueue task"))
		return
	}
	response.Success(c, gin.H{"task_id": id})
}

// Stream godoc
// @Summary 任务状态 SSE 流
// @Description 通过 query param token 认证，建立任务状态实时事件流
// @Tags queue
// @Param token query string true "JWT Token"
// @Produce text/event-stream
// @Router /queue/stream [get]
func (h *QueueHandler) Stream(c *gin.Context) {
	if _, ok := authenticateRequest(c, h.authService); !ok {
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	ch, unsub := h.queue.Subscribe()
	defer unsub()

	notify := c.Request.Context().Done()
	for {
		select {
		case <-notify:
			return
		case event, open := <-ch:
			if !open {
				return
			}
			data, _ := json.Marshal(event)
			fmt.Fprintf(c.Writer, "data: %s\n\n", data)
			c.Writer.Flush()
		}
	}
}
