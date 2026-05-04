package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type DockerHandler struct {
	containerService *services.ContainerService
	instanceService  *services.InstanceService
}

func NewDockerHandler(containerService *services.ContainerService, instanceService *services.InstanceService) *DockerHandler {
	return &DockerHandler{containerService: containerService, instanceService: instanceService}
}

func (h *DockerHandler) ListImages(c *gin.Context) {
	images, err := h.containerService.ListImages(c.Request.Context())
	if err != nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("failed to list images: "+err.Error()))
		return
	}
	response.Success(c, images)
}

type pullImageRequest struct {
	Image string `json:"image" binding:"required"`
}

func (h *DockerHandler) PullImage(c *gin.Context) {
	var req pullImageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("image name required"))
		return
	}
	if err := h.containerService.PullImage(c.Request.Context(), req.Image); err != nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("failed to pull image: "+err.Error()))
		return
	}
	response.Success(c, gin.H{"image": req.Image, "status": "pulled"})
}

func (h *DockerHandler) RemoveImage(c *gin.Context) {
	imageID := c.Param("imageId")
	if imageID == "" {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("image id required"))
		return
	}
	if err := h.containerService.RemoveImage(c.Request.Context(), imageID); err != nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("failed to remove image: "+err.Error()))
		return
	}
	response.Success(c, nil)
}

func (h *DockerHandler) RenewInstance(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid instance id"))
		return
	}
	extra := 3600
	if v := c.Query("seconds"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			extra = parsed
		}
	}
	if appErr := h.instanceService.RenewInstance(c.Request.Context(), id, extra); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, gin.H{"renewed_seconds": extra})
}

func (h *DockerHandler) BatchCleanup(c *gin.Context) {
	cleaned, err := h.instanceService.BatchCleanup(c.Request.Context())
	if err != nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("cleanup failed"))
		return
	}
	response.Success(c, gin.H{"cleaned": cleaned})
}
