package handlers

import (
	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type SettingHandler struct {
	service *services.SettingService
}

func NewSettingHandler(service *services.SettingService) *SettingHandler {
	return &SettingHandler{service: service}
}

// List godoc
// @Summary 获取所有系统配置
// @Description 按分组返回所有系统配置项，敏感字段值会被遮盖
// @Tags settings
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response{data=[]models.SettingGroupResponse}
// @Failure 401 {object} response.Response
// @Failure 403 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /settings/system [get]
func (h *SettingHandler) List(c *gin.Context) {
	groups, err := h.service.ListByGroup(c.Request.Context())
	if err != nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("failed to list settings"))
		return
	}
	response.Success(c, groups)
}

// Update godoc
// @Summary 批量更新系统配置
// @Description 批量更新配置项，敏感字段传入遮盖值时会跳过不更新
// @Tags settings
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body models.UpdateSettingsRequest true "配置更新"
// @Success 200 {object} response.Response
// @Failure 400 {object} response.Response
// @Failure 401 {object} response.Response
// @Failure 403 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /settings/system [put]
func (h *SettingHandler) Update(c *gin.Context) {
	var req models.UpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request body"))
		return
	}

	if err := h.service.Update(c.Request.Context(), req.Settings); err != nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("failed to update settings"))
		return
	}
	response.Success(c, nil)
}

// GetGroup godoc
// @Summary 获取分组配置
// @Description 获取指定分组的系统配置项
// @Tags settings
// @Produce json
// @Security BearerAuth
// @Param group path string true "分组名称"
// @Success 200 {object} response.Response{data=[]models.SettingItemResponse}
// @Failure 401 {object} response.Response
// @Failure 403 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /settings/system/{group} [get]
func (h *SettingHandler) GetGroup(c *gin.Context) {
	group := c.Param("group")
	items, err := h.service.GetByGroup(c.Request.Context(), group)
	if err != nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("failed to get settings"))
		return
	}
	response.Success(c, items)
}
