package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type ProjectHandler struct {
	projectService *services.ProjectService
}

func NewProjectHandler(projectService *services.ProjectService) *ProjectHandler {
	return &ProjectHandler{projectService: projectService}
}

// List godoc
// @Summary 获取项目列表
// @Description 分页获取项目列表，支持搜索和状态过滤
// @Tags projects
// @Produce json
// @Security BearerAuth
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Param search query string false "搜索关键词"
// @Param status query string false "状态过滤" Enums(active, archived, draft)
// @Success 200 {object} response.Response{data=models.PaginatedResponse}
// @Failure 401 {object} response.Response
// @Router /projects [get]
func (h *ProjectHandler) List(c *gin.Context) {
	var q models.ProjectListQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid query parameters"))
		return
	}

	result, err := h.projectService.List(c.Request.Context(), &q)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, result)
}

// GetByID godoc
// @Summary 获取项目详情
// @Description 根据 ID 获取项目详情
// @Tags projects
// @Produce json
// @Security BearerAuth
// @Param id path int true "项目 ID"
// @Success 200 {object} response.Response{data=models.ProjectResponse}
// @Failure 404 {object} response.Response
// @Router /projects/{id} [get]
func (h *ProjectHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid project id"))
		return
	}

	resp, appErr := h.projectService.GetByIDWithOwner(c.Request.Context(), id)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, resp)
}

// Create godoc
// @Summary 创建项目
// @Description 创建新项目
// @Tags projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body models.CreateProjectRequest true "创建项目请求"
// @Success 200 {object} response.Response{data=models.ProjectResponse}
// @Failure 400 {object} response.Response
// @Router /projects [post]
func (h *ProjectHandler) Create(c *gin.Context) {
	var req models.CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	userID, _ := c.Get("user_id")
	id, _ := userID.(int)
	usernameVal, _ := c.Get("username")
	username, _ := usernameVal.(string)

	p, err := h.projectService.Create(c.Request.Context(), &req, id, username, c.ClientIP())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, models.ProjectResponse{
		ID:          p.ID,
		Name:        p.Name,
		Description: p.Description,
		Status:      p.Status,
		OwnerID:     p.OwnerID,
		OwnerName:   username,
		CreatedAt:   p.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:   p.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

// Update godoc
// @Summary 更新项目
// @Description 更新项目信息
// @Tags projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "项目 ID"
// @Param request body models.UpdateProjectRequest true "更新项目请求"
// @Success 200 {object} response.Response{data=models.ProjectResponse}
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Router /projects/{id} [put]
func (h *ProjectHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid project id"))
		return
	}

	var req models.UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)
	usernameVal, _ := c.Get("username")
	username, _ := usernameVal.(string)

	p, appErr := h.projectService.Update(c.Request.Context(), id, &req, uid, username, c.ClientIP())
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, models.ProjectResponse{
		ID:          p.ID,
		Name:        p.Name,
		Description: p.Description,
		Status:      p.Status,
		OwnerID:     p.OwnerID,
		OwnerName:   username,
		CreatedAt:   p.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:   p.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

// BatchDelete godoc
// @Summary 批量删除项目
// @Tags projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body models.BatchDeleteRequest true "批量删除请求"
// @Success 200 {object} response.Response
// @Router /projects/batch-delete [post]
func (h *ProjectHandler) BatchDelete(c *gin.Context) {
	var req models.BatchDeleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)
	usernameVal, _ := c.Get("username")
	username, _ := usernameVal.(string)

	deleted, errs, err := h.projectService.BatchDelete(c.Request.Context(), req.IDs, uid, username, c.ClientIP())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	if len(errs) > 0 {
		response.Success(c, gin.H{"deleted": deleted, "errors": errs})
		return
	}

	response.Success(c, gin.H{"deleted": deleted})
}

// Delete godoc
// @Summary 删除项目
// @Description 删除指定项目
// @Tags projects
// @Produce json
// @Security BearerAuth
// @Param id path int true "项目 ID"
// @Success 200 {object} response.Response
// @Failure 400 {object} response.Response
// @Failure 404 {object} response.Response
// @Router /projects/{id} [delete]
func (h *ProjectHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid project id"))
		return
	}

	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)
	usernameVal, _ := c.Get("username")
	username, _ := usernameVal.(string)

	if appErr := h.projectService.Delete(c.Request.Context(), id, uid, username, c.ClientIP()); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, nil)
}
