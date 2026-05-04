package handlers

import (
	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type PermissionHandler struct {
	service *services.PermissionService
}

func NewPermissionHandler(service *services.PermissionService) *PermissionHandler {
	return &PermissionHandler{service: service}
}

// List godoc
// @Summary 获取权限列表
// @Description 获取全部权限
// @Tags permissions
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response{data=[]models.PermissionResponse}
// @Failure 401 {object} response.Response
// @Router /permissions [get]
func (h *PermissionHandler) List(c *gin.Context) {
	perms, err := h.service.List(c.Request.Context())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	items := make([]models.PermissionResponse, 0, len(perms))
	for _, p := range perms {
		items = append(items, models.PermissionResponse{
			ID:          p.ID,
			Code:        p.Code,
			Name:        p.Name,
			Resource:    p.Resource,
			Action:      p.Action,
			Scope:       p.Scope,
			Description: p.Description,
			Category:    p.Category,
		})
	}

	response.Success(c, items)
}

// ListByCategory godoc
// @Summary 按分类获取权限
// @Description 按分类分组返回全部权限
// @Tags permissions
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response{data=[]models.PermissionCategoryResponse}
// @Failure 401 {object} response.Response
// @Router /permissions/categories [get]
func (h *PermissionHandler) ListByCategory(c *gin.Context) {
	categories, err := h.service.ListByCategory(c.Request.Context())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, categories)
}
