package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"github.com/ZacharyZcR/STC/backend/internal/server"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type WSHandler struct {
	hub         *server.Hub
	authService *services.AuthService
	upgrader    websocket.Upgrader
}

func NewWSHandler(hub *server.Hub, authService *services.AuthService, allowedOrigins []string) *WSHandler {
	return &WSHandler{
		hub:         hub,
		authService: authService,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				if len(allowedOrigins) == 0 {
					return true
				}
				origin := strings.TrimSpace(r.Header.Get("Origin"))
				if origin == "" {
					return true
				}
				for _, allowed := range allowedOrigins {
					if allowed == origin {
						return true
					}
				}
				return false
			},
		},
	}
}

// Handle godoc
// @Summary WebSocket 连接
// @Description 通过 query param token 认证，升级为 WebSocket 实时通信
// @Tags ws
// @Param token query string true "JWT Token"
// @Router /ws [get]
func (h *WSHandler) Handle(c *gin.Context) {
	claims, ok := authenticateRequest(c, h.authService)
	if !ok {
		return
	}

	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	client := &server.Client{
		Hub:      h.hub,
		Conn:     conn,
		Send:     make(chan []byte, 256),
		UserID:   claims.UserID,
		Username: claims.Username,
	}

	h.hub.Register(client)

	go client.WritePump()
	go client.ReadPump()
}

// OnlineUsers godoc
// @Summary 获取在线用户列表
// @Description 返回当前 WebSocket 在线用户
// @Tags ws
// @Produce json
// @Success 200 {object} response.Response{data=[]server.OnlineUser}
// @Router /ws/online [get]
func (h *WSHandler) OnlineUsers(c *gin.Context) {
	if _, ok := authenticateRequest(c, h.authService); !ok {
		return
	}
	response.Success(c, h.hub.OnlineUsers())
}
