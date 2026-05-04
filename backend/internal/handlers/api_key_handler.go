package handlers

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type APIKeyHandler struct {
	apiKeyService *services.APIKeyService
}

func NewAPIKeyHandler(apiKeyService *services.APIKeyService) *APIKeyHandler {
	return &APIKeyHandler{apiKeyService: apiKeyService}
}

type generateAPIKeyRequest struct {
	Name      string  `json:"name" binding:"required,max=100"`
	ExpiresAt *string `json:"expires_at"`
}

type apiKeyResponse struct {
	ID         int     `json:"id"`
	Name       string  `json:"name"`
	KeyPrefix  string  `json:"key_prefix"`
	Enabled    bool    `json:"enabled"`
	ExpiresAt  *string `json:"expires_at,omitempty"`
	LastUsedAt *string `json:"last_used_at,omitempty"`
	CreatedAt  string  `json:"created_at"`
}

// List godoc
// @Summary 列出当前用户的 API Key
// @Tags api-keys
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response
// @Router /api-keys [get]
func (h *APIKeyHandler) List(c *gin.Context) {
	userID := c.GetInt("user_id")

	items, err := h.apiKeyService.List(c.Request.Context(), userID)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	result := make([]apiKeyResponse, 0, len(items))
	for _, item := range items {
		r := apiKeyResponse{
			ID:        item.ID,
			Name:      item.Name,
			KeyPrefix: item.KeyPrefix,
			Enabled:   item.Enabled,
			CreatedAt: item.CreatedAt.Format(time.RFC3339),
		}
		if item.ExpiresAt != nil {
			s := item.ExpiresAt.Format(time.RFC3339)
			r.ExpiresAt = &s
		}
		if item.LastUsedAt != nil {
			s := item.LastUsedAt.Format(time.RFC3339)
			r.LastUsedAt = &s
		}
		result = append(result, r)
	}

	response.Success(c, result)
}

// Generate godoc
// @Summary 生成新 API Key
// @Tags api-keys
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response
// @Router /api-keys [post]
func (h *APIKeyHandler) Generate(c *gin.Context) {
	var req generateAPIKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	userID := c.GetInt("user_id")

	var expiresAt *time.Time
	if req.ExpiresAt != nil && *req.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid expires_at format"))
			return
		}
		expiresAt = &t
	}

	plainKey, record, err := h.apiKeyService.Generate(c.Request.Context(), req.Name, userID, expiresAt)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, gin.H{
		"key":        plainKey,
		"id":         record.ID,
		"name":       record.Name,
		"key_prefix": record.KeyPrefix,
		"created_at": record.CreatedAt.Format(time.RFC3339),
	})
}

// Revoke godoc
// @Summary 吊销 API Key
// @Tags api-keys
// @Produce json
// @Security BearerAuth
// @Param id path int true "API Key ID"
// @Success 200 {object} response.Response
// @Router /api-keys/{id} [delete]
func (h *APIKeyHandler) Revoke(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid api key id"))
		return
	}

	userID := c.GetInt("user_id")

	if appErr := h.apiKeyService.Revoke(c.Request.Context(), id, userID); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, nil)
}
