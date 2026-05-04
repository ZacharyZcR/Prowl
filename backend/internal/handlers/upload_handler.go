package handlers

import (
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/internal/middleware"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type UploadHandler struct {
	uploadService *services.UploadService
	authService   *services.AuthService
}

func NewUploadHandler(uploadService *services.UploadService, authService *services.AuthService) *UploadHandler {
	return &UploadHandler{uploadService: uploadService, authService: authService}
}

// Upload godoc
// @Summary 上传文件
// @Description 上传单个文件，限制 10MB，同时创建文件记录
// @Tags files
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param file formData file true "上传文件"
// @Success 200 {object} response.Response{data=models.FileResponse}
// @Failure 400 {object} response.Response
// @Router /files/upload [post]
func (h *UploadHandler) Upload(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("file is required"))
		return
	}

	const maxSize = 10 << 20 // 10MB
	if file.Size > maxSize {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("file size exceeds 10MB limit"))
		return
	}

	uploaderID, _ := c.Get("user_id")
	uploaderName, _ := c.Get("username")

	record, saveErr := h.uploadService.SaveFile(c.Request.Context(), file, uploaderID.(int), uploaderName.(string))
	if saveErr != nil {
		response.AppError(c, saveErr.(*apperr.AppError))
		return
	}

	response.Success(c, models.FileResponse{
		ID:           record.ID,
		Name:         record.Name,
		Path:         record.Path,
		Size:         record.Size,
		MimeType:     record.MimeType,
		UploaderID:   record.UploaderID,
		UploaderName: record.UploaderName,
		URL:          "/uploads/" + record.Path,
		CreatedAt:    record.CreatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

// List godoc
// @Summary 文件列表
// @Description 分页获取文件列表
// @Tags files
// @Produce json
// @Security BearerAuth
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Success 200 {object} response.Response{data=models.PaginatedResponse}
// @Router /files [get]
func (h *UploadHandler) List(c *gin.Context) {
	var q models.FileListQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid query parameters"))
		return
	}

	userID := c.GetInt("user_id")
	includeAll, appErr := h.canManageAllFiles(c, userID)
	if appErr != nil {
		response.AppError(c, appErr)
		return
	}

	result, err := h.uploadService.List(c.Request.Context(), &q, userID, includeAll)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, result)
}

// GetByID godoc
// @Summary 获取文件信息
// @Description 根据 ID 获取文件详情
// @Tags files
// @Produce json
// @Security BearerAuth
// @Param id path int true "文件 ID"
// @Success 200 {object} response.Response{data=models.FileResponse}
// @Failure 404 {object} response.Response
// @Router /files/{id} [get]
func (h *UploadHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid file id"))
		return
	}

	f, err := h.uploadService.GetByID(c.Request.Context(), id)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}
	if !h.canViewFile(c, c.GetInt("user_id"), f) {
		return
	}

	response.Success(c, models.FileResponse{
		ID:           f.ID,
		Name:         f.Name,
		Path:         f.Path,
		Size:         f.Size,
		MimeType:     f.MimeType,
		UploaderID:   f.UploaderID,
		UploaderName: f.UploaderName,
		URL:          "/uploads/" + f.Path,
		CreatedAt:    f.CreatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

// Delete godoc
// @Summary 删除文件
// @Description 删除文件记录及磁盘文件（仅上传者可删除）
// @Tags files
// @Produce json
// @Security BearerAuth
// @Param id path int true "文件 ID"
// @Success 200 {object} response.Response
// @Failure 403 {object} response.Response
// @Failure 404 {object} response.Response
// @Router /files/{id} [delete]
func (h *UploadHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid file id"))
		return
	}

	record, err := h.uploadService.GetByID(c.Request.Context(), id)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}
	if !h.canDeleteFile(c, c.GetInt("user_id"), record) {
		return
	}

	if err := h.uploadService.Delete(c.Request.Context(), id); err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, nil)
}

func (h *UploadHandler) Serve(c *gin.Context) {
	claims, ok := authenticateRequest(c, h.authService)
	if !ok {
		return
	}
	c.Set("role", claims.Role)

	relativePath := strings.TrimPrefix(c.Param("filepath"), "/")
	record, err := h.uploadService.GetByPath(c.Request.Context(), relativePath)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}
	if !h.canAccessFile(c, claims.UserID, record) {
		return
	}

	fullPath, err := h.uploadService.ResolvePath(relativePath)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	info, statErr := os.Stat(fullPath)
	if statErr != nil || info.IsDir() {
		response.Error(c, http.StatusNotFound, "file not found")
		return
	}

	c.Header("X-Content-Type-Options", "nosniff")
	c.File(fullPath)
}

func (h *UploadHandler) canAccessFile(c *gin.Context, userID int, record *ent.File) bool {
	return h.canViewFile(c, userID, record)
}

func (h *UploadHandler) canViewFile(c *gin.Context, userID int, record *ent.File) bool {
	if record.UploaderID == userID {
		return true
	}

	allowed, err := h.hasAnyPermission(c, userID, "upload:read", "system:settings")
	if err != nil {
		response.AppError(c, err)
		return false
	}
	if allowed {
		return true
	}

	response.AppError(c, apperr.ErrForbidden.WithMessage("cannot access this file"))
	return false
}

func (h *UploadHandler) canDeleteFile(c *gin.Context, userID int, record *ent.File) bool {
	if record.UploaderID == userID {
		return true
	}

	allowed, err := h.hasAnyPermission(c, userID, "upload:delete", "system:settings")
	if err != nil {
		response.AppError(c, err)
		return false
	}
	if allowed {
		return true
	}

	response.AppError(c, apperr.ErrForbidden.WithMessage("cannot delete this file"))
	return false
}

func (h *UploadHandler) canManageAllFiles(c *gin.Context, userID int) (bool, *apperr.AppError) {
	return h.hasAnyPermission(c, userID, "upload:read", "system:settings")
}

func (h *UploadHandler) hasAnyPermission(c *gin.Context, _ int, permissions ...string) (bool, *apperr.AppError) {
	role, _ := c.Get("role")
	roleName, _ := role.(string)
	cs := middleware.GetCasbinService()
	if cs == nil {
		return false, nil
	}
	for _, perm := range permissions {
		if cs.CheckPermission(roleName, perm) {
			return true, nil
		}
	}
	return false, nil
}
