package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type AntiCheatHandler struct {
	service *services.AntiCheatService
}

func NewAntiCheatHandler(service *services.AntiCheatService) *AntiCheatHandler {
	return &AntiCheatHandler{service: service}
}

func (h *AntiCheatHandler) Report(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}

	report, appErr := h.service.GenerateReport(c.Request.Context(), compID)
	if appErr != nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("failed to generate report"))
		return
	}
	response.Success(c, report)
}
