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

type AnnouncementHandler struct {
	announcementService *services.AnnouncementService
}

func NewAnnouncementHandler(announcementService *services.AnnouncementService) *AnnouncementHandler {
	return &AnnouncementHandler{announcementService: announcementService}
}

func (h *AnnouncementHandler) List(c *gin.Context) {
	items, err := h.announcementService.List(c.Request.Context())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	result := make([]models.AnnouncementResponse, 0, len(items))
	for _, item := range items {
		result = append(result, toAnnouncementResponse(item))
	}

	response.Success(c, result)
}

func (h *AnnouncementHandler) ListActive(c *gin.Context) {
	items, err := h.announcementService.ListPublished(c.Request.Context())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	result := make([]models.AnnouncementResponse, 0, len(items))
	for _, item := range items {
		result = append(result, toAnnouncementResponse(item))
	}

	response.Success(c, result)
}

func (h *AnnouncementHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid announcement id"))
		return
	}

	a, appErr := h.announcementService.GetByID(c.Request.Context(), id)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, toAnnouncementResponse(a))
}

func (h *AnnouncementHandler) Create(c *gin.Context) {
	var req models.CreateAnnouncementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	a, err := h.announcementService.Create(c.Request.Context(), &req, uid)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, toAnnouncementResponse(a))
}

func (h *AnnouncementHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid announcement id"))
		return
	}

	var req models.UpdateAnnouncementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	a, appErr := h.announcementService.Update(c.Request.Context(), id, &req)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, toAnnouncementResponse(a))
}

func (h *AnnouncementHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid announcement id"))
		return
	}

	if appErr := h.announcementService.Delete(c.Request.Context(), id); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, nil)
}

func (h *AnnouncementHandler) Publish(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid announcement id"))
		return
	}

	if appErr := h.announcementService.Publish(c.Request.Context(), id); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, nil)
}

func (h *AnnouncementHandler) Unpublish(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid announcement id"))
		return
	}

	if appErr := h.announcementService.Unpublish(c.Request.Context(), id); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, nil)
}

func toAnnouncementResponse(a *ent.Announcement) models.AnnouncementResponse {
	resp := models.AnnouncementResponse{
		ID:        a.ID,
		Title:     a.Title,
		Content:   a.Content,
		Priority:  string(a.Priority),
		Published: a.Published,
		CreatedBy: a.CreatedBy,
		CreatedAt: a.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt: a.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}

	if a.PublishedAt != nil {
		resp.PublishedAt = a.PublishedAt.Format("2006-01-02T15:04:05Z")
	}
	if a.ExpiresAt != nil {
		resp.ExpiresAt = a.ExpiresAt.Format("2006-01-02T15:04:05Z")
	}

	return resp
}
