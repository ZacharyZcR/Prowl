package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type AWDTimelineHandler struct {
	service *services.AWDTimelineService
}

func NewAWDTimelineHandler(service *services.AWDTimelineService) *AWDTimelineHandler {
	return &AWDTimelineHandler{service: service}
}

func (h *AWDTimelineHandler) GetTimeline(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	timeline, appErr := h.service.GetTimeline(c.Request.Context(), compID)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, timeline)
}
