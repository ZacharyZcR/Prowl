package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type FlagHandler struct {
	flagService *services.FlagService
	teamService *services.TeamService
}

func NewFlagHandler(flagService *services.FlagService, teamService *services.TeamService) *FlagHandler {
	return &FlagHandler{flagService: flagService, teamService: teamService}
}

func (h *FlagHandler) Submit(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}

	var req models.SubmitFlagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	myTeam, appErr := h.teamService.GetByUserID(c.Request.Context(), uid)
	if appErr != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("you must be in a team to submit flags"))
		return
	}

	resp, appErr := h.flagService.Submit(c.Request.Context(), compID, myTeam.ID, uid, &req, c.ClientIP())
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, resp)
}

func (h *FlagHandler) ListSubmissions(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}

	var q models.SubmissionListQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid query parameters"))
		return
	}

	result, appErr := h.flagService.ListSubmissions(c.Request.Context(), compID, &q)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, result)
}
