package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type WebhookHandler struct {
	webhookService *services.WebhookService
}

func NewWebhookHandler(webhookService *services.WebhookService) *WebhookHandler {
	return &WebhookHandler{webhookService: webhookService}
}

func (h *WebhookHandler) List(c *gin.Context) {
	items, err := h.webhookService.List(c.Request.Context())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	result := make([]models.WebhookResponse, 0, len(items))
	for _, w := range items {
		result = append(result, toWebhookResponse(w))
	}

	response.Success(c, result)
}

func (h *WebhookHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid webhook id"))
		return
	}

	w, appErr := h.webhookService.GetByID(c.Request.Context(), id)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, toWebhookResponse(w))
}

func (h *WebhookHandler) Create(c *gin.Context) {
	var req models.CreateWebhookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	w, err := h.webhookService.Create(c.Request.Context(), &req)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, toWebhookResponse(w))
}

func (h *WebhookHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid webhook id"))
		return
	}

	var req models.UpdateWebhookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	w, appErr := h.webhookService.Update(c.Request.Context(), id, &req)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, toWebhookResponse(w))
}

func (h *WebhookHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid webhook id"))
		return
	}

	if appErr := h.webhookService.Delete(c.Request.Context(), id); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, nil)
}

func (h *WebhookHandler) Toggle(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid webhook id"))
		return
	}

	if appErr := h.webhookService.Toggle(c.Request.Context(), id); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, nil)
}

func (h *WebhookHandler) Test(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid webhook id"))
		return
	}

	result, appErr := h.webhookService.Test(c.Request.Context(), id)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, result)
}

func toWebhookResponse(w *ent.Webhook) models.WebhookResponse {
	resp := models.WebhookResponse{
		ID:             w.ID,
		Name:           w.Name,
		URL:            w.URL,
		HasSecret:      w.Secret != "",
		Events:         w.Events,
		Headers:        w.Headers,
		Enabled:        w.Enabled,
		LastStatusCode: w.LastStatusCode,
		FailureCount:   w.FailureCount,
		CreatedAt:      w.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}

	if w.LastTriggeredAt != nil {
		resp.LastTriggeredAt = w.LastTriggeredAt.Format("2006-01-02T15:04:05Z")
	}

	if resp.Events == nil {
		resp.Events = []string{}
	}
	if resp.Headers == nil {
		resp.Headers = map[string]string{}
	}

	return resp
}
