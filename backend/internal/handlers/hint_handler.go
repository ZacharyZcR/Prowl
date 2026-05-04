package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type HintHandler struct {
	hintService *services.HintService
	teamService *services.TeamService
}

func NewHintHandler(hintService *services.HintService, teamService *services.TeamService) *HintHandler {
	return &HintHandler{hintService: hintService, teamService: teamService}
}

func (h *HintHandler) Unlock(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	chalID, err := strconv.Atoi(c.Param("cid"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid challenge id"))
		return
	}
	hintID, err := strconv.Atoi(c.Param("hid"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid hint id"))
		return
	}

	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	myTeam, appErr := h.teamService.GetByUserID(c.Request.Context(), uid)
	if appErr != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("you must be in a team"))
		return
	}

	result, appErr := h.hintService.UnlockHint(c.Request.Context(), compID, chalID, hintID, myTeam.ID)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, result)
}
