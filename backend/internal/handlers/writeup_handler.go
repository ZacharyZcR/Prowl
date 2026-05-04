package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type WriteupHandler struct {
	writeupService *services.WriteupService
	teamService    *services.TeamService
}

func NewWriteupHandler(writeupService *services.WriteupService, teamService *services.TeamService) *WriteupHandler {
	return &WriteupHandler{writeupService: writeupService, teamService: teamService}
}

func (h *WriteupHandler) Create(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}

	var req models.CreateWriteupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	myTeam, appErr := h.teamService.GetByUserID(c.Request.Context(), uid)
	if appErr != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("you must be in a team"))
		return
	}

	w, appErr := h.writeupService.Create(c.Request.Context(), compID, myTeam.ID, uid, &req)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, gin.H{"id": w.ID})
}

func (h *WriteupHandler) List(c *gin.Context) {
	var q models.WriteupListQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid query parameters"))
		return
	}

	result, appErr := h.writeupService.List(c.Request.Context(), &q)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, result)
}

func (h *WriteupHandler) Review(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid writeup id"))
		return
	}

	var req models.ReviewWriteupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	if appErr := h.writeupService.Review(c.Request.Context(), id, &req, uid); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *WriteupHandler) MyWriteups(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}

	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	myTeam, appErr := h.teamService.GetByUserID(c.Request.Context(), uid)
	if appErr != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("you must be in a team"))
		return
	}

	q := &models.WriteupListQuery{
		CompetitionID: compID,
		TeamID:        myTeam.ID,
		Page:          1,
		PageSize:      100,
	}
	result, appErr := h.writeupService.List(c.Request.Context(), q)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, result)
}
