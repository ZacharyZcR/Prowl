package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type AIHandler struct {
	service *services.AIService
}

func NewAIHandler(service *services.AIService) *AIHandler {
	return &AIHandler{service: service}
}

// GetConfig godoc
// @Summary 获取 AI 配置
// @Tags ai
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response{data=models.AIConfigResponse}
// @Router /ai/config [get]
func (h *AIHandler) GetConfig(c *gin.Context) {
	cfg, err := h.service.GetConfig(c.Request.Context())
	if err != nil {
		response.AppError(c, apperr.ErrNotFound.WithMessage("AI config not found"))
		return
	}
	response.Success(c, services.BuildAIConfigResponse(cfg))
}

// UpdateConfig godoc
// @Summary 更新 AI 配置
// @Tags ai
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body models.UpdateAIConfigRequest true "更新配置请求"
// @Success 200 {object} response.Response{data=models.AIConfigResponse}
// @Router /ai/config [put]
func (h *AIHandler) UpdateConfig(c *gin.Context) {
	var req models.UpdateAIConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request"))
		return
	}
	cfg, err := h.service.UpdateConfig(c.Request.Context(), &req)
	if err != nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("failed to update AI config"))
		return
	}
	response.Success(c, services.BuildAIConfigResponse(cfg))
}

// ListConversations godoc
// @Summary 列出对话
// @Tags ai
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response{data=[]models.ConversationResponse}
// @Router /ai/conversations [get]
func (h *AIHandler) ListConversations(c *gin.Context) {
	userID := c.GetInt("user_id")
	convs, err := h.service.ListConversations(c.Request.Context(), userID)
	if err != nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("failed to list conversations"))
		return
	}
	list := make([]models.ConversationResponse, 0, len(convs))
	for _, conv := range convs {
		list = append(list, services.BuildConversationResponse(conv))
	}
	response.Success(c, list)
}

// CreateConversation godoc
// @Summary 创建对话
// @Tags ai
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body models.CreateConversationRequest false "创建对话请求"
// @Success 200 {object} response.Response{data=models.ConversationResponse}
// @Router /ai/conversations [post]
func (h *AIHandler) CreateConversation(c *gin.Context) {
	userID := c.GetInt("user_id")
	var req models.CreateConversationRequest
	_ = c.ShouldBindJSON(&req)
	conv, err := h.service.CreateConversation(c.Request.Context(), userID, req.Title)
	if err != nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("failed to create conversation"))
		return
	}
	response.Success(c, services.BuildConversationResponse(conv))
}

// DeleteConversation godoc
// @Summary 删除对话
// @Tags ai
// @Produce json
// @Security BearerAuth
// @Param id path int true "对话 ID"
// @Success 200 {object} response.Response
// @Router /ai/conversations/{id} [delete]
func (h *AIHandler) DeleteConversation(c *gin.Context) {
	userID := c.GetInt("user_id")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid id"))
		return
	}
	if err := h.service.DeleteConversation(c.Request.Context(), id, userID); err != nil {
		response.AppError(c, apperr.ErrNotFound.WithMessage("conversation not found"))
		return
	}
	response.Success(c, nil)
}

// GetMessages godoc
// @Summary 获取对话消息
// @Tags ai
// @Produce json
// @Security BearerAuth
// @Param id path int true "对话 ID"
// @Success 200 {object} response.Response{data=[]models.MessageResponse}
// @Router /ai/conversations/{id}/messages [get]
func (h *AIHandler) GetMessages(c *gin.Context) {
	userID := c.GetInt("user_id")
	convID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid id"))
		return
	}
	msgs, err := h.service.GetMessages(c.Request.Context(), convID, userID)
	if err != nil {
		response.AppError(c, apperr.ErrNotFound.WithMessage("conversation not found"))
		return
	}
	var list []models.MessageResponse
	for _, m := range msgs {
		list = append(list, services.BuildMessageResponse(m))
	}
	response.Success(c, list)
}

// StreamChat godoc
// @Summary AI Agent 流式对话
// @Description 发送消息并以 SSE 流式返回 AI Agent 回复，支持工具调用
// @Tags ai
// @Accept json
// @Produce text/event-stream
// @Security BearerAuth
// @Param id path int true "对话 ID"
// @Param request body models.ChatRequest true "聊天请求"
// @Success 200 {string} string "SSE event stream"
// @Router /ai/conversations/{id}/chat [post]
func (h *AIHandler) StreamChat(c *gin.Context) {
	userID := c.GetInt("user_id")
	convID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid id"))
		return
	}

	var req models.ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("message is required"))
		return
	}

	ch, err := h.service.AgentChat(c.Request.Context(), convID, userID, req.Message)
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage(err.Error()))
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	flusher := c.Writer

	for event := range ch {
		data, _ := json.Marshal(event)
		fmt.Fprintf(flusher, "data: %s\n\n", data)
		flusher.Flush()

		if event.Type == "error" || event.Type == "done" {
			break
		}
	}

	for range ch {
	}

	c.Writer.WriteHeader(http.StatusOK)
}
