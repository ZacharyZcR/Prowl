package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type UserHandler struct {
	userService *services.UserService
	authService *services.AuthService
}

func NewUserHandler(userService *services.UserService, authService *services.AuthService) *UserHandler {
	return &UserHandler{userService: userService, authService: authService}
}

// GetMe godoc
// @Summary 获取当前用户信息
// @Description 返回当前登录用户的信息
// @Tags users
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response{data=models.UserResponse}
// @Failure 401 {object} response.Response
// @Router /users/me [get]
func (h *UserHandler) GetMe(c *gin.Context) {
	userID, _ := c.Get("user_id")
	id, ok := userID.(int)
	if !ok {
		response.AppError(c, apperr.ErrUnauthorized)
		return
	}

	u, err := h.userService.GetByID(c.Request.Context(), id)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, services.BuildUserResponse(u))
}

// UpdateMe godoc
// @Summary 更新当前用户资料
// @Description 更新当前登录用户的邮箱和昵称
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body models.UpdateUserRequest true "更新当前用户请求"
// @Success 200 {object} response.Response{data=models.UserResponse}
// @Failure 400 {object} response.Response
// @Failure 401 {object} response.Response
// @Router /users/me [put]
func (h *UserHandler) UpdateMe(c *gin.Context) {
	userID, _ := c.Get("user_id")
	id, ok := userID.(int)
	if !ok {
		response.AppError(c, apperr.ErrUnauthorized)
		return
	}

	var req models.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	req.RoleID = nil

	u, appErr := h.userService.Update(c.Request.Context(), id, &req)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, services.BuildUserResponse(u))
}

// List godoc
// @Summary 获取用户列表
// @Description 分页获取用户列表，支持搜索
// @Tags users
// @Produce json
// @Security BearerAuth
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Param search query string false "搜索关键词"
// @Success 200 {object} response.Response{data=models.PaginatedResponse}
// @Failure 401 {object} response.Response
// @Router /users [get]
func (h *UserHandler) List(c *gin.Context) {
	var q models.ListQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid query parameters"))
		return
	}

	result, err := h.userService.List(c.Request.Context(), &q)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, result)
}

// GetByID godoc
// @Summary 获取用户详情
// @Description 根据 ID 获取用户详情
// @Tags users
// @Produce json
// @Security BearerAuth
// @Param id path int true "用户 ID"
// @Success 200 {object} response.Response{data=models.UserResponse}
// @Failure 404 {object} response.Response
// @Router /users/{id} [get]
func (h *UserHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid user id"))
		return
	}

	u, appErr := h.userService.GetByID(c.Request.Context(), id)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, services.BuildUserResponse(u))
}

// Create godoc
// @Summary 创建用户
// @Description 创建新用户
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body models.CreateUserRequest true "创建用户请求"
// @Success 200 {object} response.Response{data=models.UserResponse}
// @Failure 400 {object} response.Response
// @Router /users [post]
func (h *UserHandler) Create(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	u, err := h.userService.Create(c.Request.Context(), &req)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, services.BuildUserResponse(u))
}

// Update godoc
// @Summary 更新用户
// @Description 更新用户信息
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "用户 ID"
// @Param request body models.UpdateUserRequest true "更新用户请求"
// @Success 200 {object} response.Response{data=models.UserResponse}
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Router /users/{id} [put]
func (h *UserHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid user id"))
		return
	}

	var req models.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	u, appErr := h.userService.Update(c.Request.Context(), id, &req)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, services.BuildUserResponse(u))
}

// Delete godoc
// @Summary 删除用户
// @Description 删除指定用户
// @Tags users
// @Produce json
// @Security BearerAuth
// @Param id path int true "用户 ID"
// @Success 200 {object} response.Response
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Router /users/{id} [delete]
func (h *UserHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid user id"))
		return
	}

	currentUserID, _ := c.Get("user_id")
	currentID, _ := currentUserID.(int)

	if appErr := h.userService.Delete(c.Request.Context(), id, currentID); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, nil)
}

// BatchDelete godoc
// @Summary 批量删除用户
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body models.BatchDeleteRequest true "批量删除请求"
// @Success 200 {object} response.Response
// @Router /users/batch-delete [post]
func (h *UserHandler) BatchDelete(c *gin.Context) {
	var req models.BatchDeleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	currentUserID, _ := c.Get("user_id")
	currentID, _ := currentUserID.(int)

	var errs []string
	for _, id := range req.IDs {
		if appErr := h.userService.Delete(c.Request.Context(), id, currentID); appErr != nil {
			errs = append(errs, appErr.Error())
		}
	}

	if len(errs) > 0 {
		response.Success(c, gin.H{"deleted": len(req.IDs) - len(errs), "errors": errs})
		return
	}

	response.Success(c, gin.H{"deleted": len(req.IDs)})
}

// ChangePassword godoc
// @Summary 修改密码
// @Description 修改当前用户密码
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body models.ChangePasswordRequest true "修改密码请求"
// @Success 200 {object} response.Response
// @Failure 400 {object} response.Response
// @Router /users/me/password [put]
func (h *UserHandler) ChangePassword(c *gin.Context) {
	var req models.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	userID, _ := c.Get("user_id")
	id, ok := userID.(int)
	if !ok {
		response.AppError(c, apperr.ErrUnauthorized)
		return
	}

	if err := h.userService.ChangePassword(c.Request.Context(), id, req.OldPassword, req.NewPassword); err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, nil)
}
