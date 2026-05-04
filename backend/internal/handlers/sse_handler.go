package handlers

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/server"
	"github.com/ZacharyZcR/STC/backend/internal/services"
)

type SSEHandler struct {
	broker      *server.SSEBroker
	authService *services.AuthService
}

func NewSSEHandler(broker *server.SSEBroker, authService *services.AuthService) *SSEHandler {
	return &SSEHandler{broker: broker, authService: authService}
}

// Handle godoc
// @Summary SSE 事件流
// @Description 通过 query param token 认证，建立 SSE 实时事件流
// @Tags sse
// @Param token query string true "JWT Token"
// @Produce text/event-stream
// @Router /sse [get]
func (h *SSEHandler) Handle(c *gin.Context) {
	claims, ok := authenticateRequest(c, h.authService)
	if !ok {
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	ch, unsubscribe := h.broker.Subscribe(claims.UserID, claims.Username)
	defer unsubscribe()

	flusher := c.Writer

	fmt.Fprintf(flusher, ": connected\n\n")
	flusher.Flush()

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case event, open := <-ch:
			if !open {
				return
			}
			data, err := json.Marshal(event.Data)
			if err != nil {
				continue
			}
			if event.ID != "" {
				fmt.Fprintf(flusher, "id: %s\n", event.ID)
			}
			fmt.Fprintf(flusher, "event: %s\ndata: %s\n\n", event.Event, data)
			flusher.Flush()
		case <-ticker.C:
			fmt.Fprintf(flusher, ": keepalive\n\n")
			flusher.Flush()
		case <-c.Request.Context().Done():
			return
		}
	}
}
