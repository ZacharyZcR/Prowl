package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type TeamHandler struct {
	service *services.TeamService
}

func NewTeamHandler(service *services.TeamService) *TeamHandler {
	return &TeamHandler{service: service}
}

func (h *TeamHandler) List(c *gin.Context) {
	var q models.TeamListQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid query parameters"))
		return
	}
	result, err := h.service.List(c.Request.Context(), &q)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}
	response.Success(c, result)
}

func (h *TeamHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid team id"))
		return
	}
	resp, appErr := h.service.GetByID(c.Request.Context(), id)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, resp)
}

func (h *TeamHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid team id"))
		return
	}
	if appErr := h.service.Delete(c.Request.Context(), id); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *TeamHandler) Create(c *gin.Context) {
	var req models.CreateTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)
	usernameVal, _ := c.Get("username")
	username, _ := usernameVal.(string)

	tm, err := h.service.Create(c.Request.Context(), &req, uid, username, c.ClientIP())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}
	response.Success(c, gin.H{"id": tm.ID, "name": tm.Name, "invite_code": tm.InviteCode})
}

func (h *TeamHandler) GetMyTeam(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	resp, err := h.service.GetByUserID(c.Request.Context(), uid)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}
	response.Success(c, resp)
}

func (h *TeamHandler) GetMyCompetitions(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)
	myTeam, err := h.service.GetByUserID(c.Request.Context(), uid)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}
	items, err := h.service.GetTeamCompetitions(c.Request.Context(), myTeam.ID)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}
	response.Success(c, items)
}

func (h *TeamHandler) UpdateMyTeam(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	myTeam, err := h.service.GetByUserID(c.Request.Context(), uid)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	var req models.UpdateTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	_, appErr := h.service.Update(c.Request.Context(), myTeam.ID, &req, uid)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *TeamHandler) Join(c *gin.Context) {
	var req models.JoinTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	if appErr := h.service.Join(c.Request.Context(), req.InviteCode, uid); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *TeamHandler) Leave(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	if appErr := h.service.Leave(c.Request.Context(), uid); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *TeamHandler) KickMember(c *gin.Context) {
	targetUID, err := strconv.Atoi(c.Param("uid"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid user id"))
		return
	}
	userID, _ := c.Get("user_id")
	captainID, _ := userID.(int)

	myTeam, appErr := h.service.GetByUserID(c.Request.Context(), captainID)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	if appErr := h.service.KickMember(c.Request.Context(), myTeam.ID, targetUID, captainID); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *TeamHandler) RegisterForCompetition(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	myTeam, appErr := h.service.GetByUserID(c.Request.Context(), uid)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	if appErr := h.service.RegisterForCompetition(c.Request.Context(), myTeam.ID, compID); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}
