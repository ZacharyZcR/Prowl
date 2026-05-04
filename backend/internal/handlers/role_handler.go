package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/middleware"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type RoleHandler struct {
	roleService *services.RoleService
	authService *services.AuthService
}

func NewRoleHandler(roleService *services.RoleService, authService *services.AuthService) *RoleHandler {
	return &RoleHandler{roleService: roleService, authService: authService}
}

// List godoc
// @Summary 获取角色列表
// @Description 获取全部角色
// @Tags roles
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response{data=[]models.RoleResponse}
// @Failure 401 {object} response.Response
// @Router /roles [get]
func (h *RoleHandler) List(c *gin.Context) {
	roles, err := h.roleService.List(c.Request.Context())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	items := make([]models.RoleResponse, 0, len(roles))
	for _, r := range roles {
		items = append(items, models.RoleResponse{
			ID:          r.ID,
			Name:        r.Name,
			Description: r.Description,
			Permissions: r.Permissions,
			UserCount:   len(r.Edges.Users),
			CreatedAt:   r.CreatedAt.Format("2006-01-02T15:04:05Z"),
		})
	}

	response.Success(c, gin.H{
		"items": items,
		"total": len(items),
	})
}

// GetByID godoc
// @Summary 获取角色详情
// @Description 根据 ID 获取角色详情
// @Tags roles
// @Produce json
// @Security BearerAuth
// @Param id path int true "角色 ID"
// @Success 200 {object} response.Response{data=models.RoleResponse}
// @Failure 404 {object} response.Response
// @Router /roles/{id} [get]
func (h *RoleHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid role id"))
		return
	}

	r, appErr := h.roleService.GetByID(c.Request.Context(), id)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, models.RoleResponse{
		ID:          r.ID,
		Name:        r.Name,
		Description: r.Description,
		Permissions: r.Permissions,
		UserCount:   len(r.Edges.Users),
		CreatedAt:   r.CreatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

// Create godoc
// @Summary 创建角色
// @Description 创建新角色
// @Tags roles
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body models.CreateRoleRequest true "创建角色请求"
// @Success 200 {object} response.Response{data=models.RoleResponse}
// @Failure 400 {object} response.Response
// @Router /roles [post]
func (h *RoleHandler) Create(c *gin.Context) {
	var req models.CreateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	r, err := h.roleService.Create(c.Request.Context(), &req)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	if cs := middleware.GetCasbinService(); cs != nil {
		cs.LoadPolicies(c.Request.Context())
	}

	response.Success(c, models.RoleResponse{
		ID:          r.ID,
		Name:        r.Name,
		Description: r.Description,
		Permissions: r.Permissions,
		CreatedAt:   r.CreatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

// Update godoc
// @Summary 更新角色
// @Description 更新角色信息
// @Tags roles
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "角色 ID"
// @Param request body models.UpdateRoleRequest true "更新角色请求"
// @Success 200 {object} response.Response{data=models.RoleResponse}
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Router /roles/{id} [put]
func (h *RoleHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid role id"))
		return
	}

	var req models.UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	r, appErr := h.roleService.Update(c.Request.Context(), id, &req)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	// Reload Casbin policies when role permissions change
	if cs := middleware.GetCasbinService(); cs != nil {
		cs.LoadPolicies(c.Request.Context())
	}

	response.Success(c, models.RoleResponse{
		ID:          r.ID,
		Name:        r.Name,
		Description: r.Description,
		Permissions: r.Permissions,
		CreatedAt:   r.CreatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

// BatchDelete godoc
// @Summary 批量删除角色
// @Tags roles
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body models.BatchDeleteRequest true "批量删除请求"
// @Success 200 {object} response.Response
// @Router /roles/batch-delete [post]
func (h *RoleHandler) BatchDelete(c *gin.Context) {
	var req models.BatchDeleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	var errs []string
	for _, id := range req.IDs {
		if appErr := h.roleService.Delete(c.Request.Context(), id); appErr != nil {
			errs = append(errs, appErr.Error())
		}
	}

	if cs := middleware.GetCasbinService(); cs != nil {
		cs.LoadPolicies(c.Request.Context())
	}

	if len(errs) > 0 {
		response.Success(c, gin.H{"deleted": len(req.IDs) - len(errs), "errors": errs})
		return
	}

	response.Success(c, gin.H{"deleted": len(req.IDs)})
}

// Delete godoc
// @Summary 删除角色
// @Description 删除指定角色
// @Tags roles
// @Produce json
// @Security BearerAuth
// @Param id path int true "角色 ID"
// @Success 200 {object} response.Response
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Router /roles/{id} [delete]
func (h *RoleHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid role id"))
		return
	}

	if appErr := h.roleService.Delete(c.Request.Context(), id); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	if cs := middleware.GetCasbinService(); cs != nil {
		cs.LoadPolicies(c.Request.Context())
	}

	response.Success(c, nil)
}
