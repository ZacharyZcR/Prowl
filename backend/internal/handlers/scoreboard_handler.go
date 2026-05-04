package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type ScoreboardHandler struct {
	service *services.ScoreboardService
}

func NewScoreboardHandler(service *services.ScoreboardService) *ScoreboardHandler {
	return &ScoreboardHandler{service: service}
}

func (h *ScoreboardHandler) GetScoreboard(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}

	resp, appErr := h.service.GetScoreboard(c.Request.Context(), compID)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, resp)
}
