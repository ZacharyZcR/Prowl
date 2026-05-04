package handlers

import (
	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type PreferenceHandler struct {
	preferenceService *services.PreferenceService
}

func NewPreferenceHandler(preferenceService *services.PreferenceService) *PreferenceHandler {
	return &PreferenceHandler{preferenceService: preferenceService}
}

// GetAll godoc
// @Summary 获取当前用户所有偏好
// @Tags preferences
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response
// @Router /preferences [get]
func (h *PreferenceHandler) GetAll(c *gin.Context) {
	userID := c.GetInt("user_id")

	prefs, err := h.preferenceService.GetAll(c.Request.Context(), userID)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, prefs)
}

// Set godoc
// @Summary 批量设置偏好
// @Tags preferences
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response
// @Router /preferences [put]
func (h *PreferenceHandler) Set(c *gin.Context) {
	var req map[string]string
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	userID := c.GetInt("user_id")

	if err := h.preferenceService.SetBatch(c.Request.Context(), userID, req); err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, nil)
}
