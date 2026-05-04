package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type ChallengeHandler struct {
	service     *services.ChallengeService
	teamService *services.TeamService
}

func NewChallengeHandler(service *services.ChallengeService, teamService *services.TeamService) *ChallengeHandler {
	return &ChallengeHandler{service: service, teamService: teamService}
}

func (h *ChallengeHandler) List(c *gin.Context) {
	var q models.ChallengeListQuery
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

func (h *ChallengeHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid challenge id"))
		return
	}
	resp, appErr := h.service.GetByID(c.Request.Context(), id)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, resp)
}

func (h *ChallengeHandler) Create(c *gin.Context) {
	var req models.CreateChallengeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)
	usernameVal, _ := c.Get("username")
	username, _ := usernameVal.(string)

	ch, err := h.service.Create(c.Request.Context(), &req, uid, username, c.ClientIP())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}
	response.Success(c, gin.H{"id": ch.ID, "title": ch.Title})
}

func (h *ChallengeHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid challenge id"))
		return
	}
	var req models.UpdateChallengeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)
	usernameVal, _ := c.Get("username")
	username, _ := usernameVal.(string)

	_, appErr := h.service.Update(c.Request.Context(), id, &req, uid, username, c.ClientIP())
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *ChallengeHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid challenge id"))
		return
	}
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)
	usernameVal, _ := c.Get("username")
	username, _ := usernameVal.(string)

	if appErr := h.service.Delete(c.Request.Context(), id, uid, username, c.ClientIP()); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *ChallengeHandler) CreateHint(c *gin.Context) {
	challengeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid challenge id"))
		return
	}
	var req models.CreateHintRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	hint, appErr := h.service.CreateHint(c.Request.Context(), challengeID, &req)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, gin.H{"id": hint.ID})
}

func (h *ChallengeHandler) UpdateHint(c *gin.Context) {
	hintID, err := strconv.Atoi(c.Param("hid"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid hint id"))
		return
	}
	var req models.UpdateHintRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	_, appErr := h.service.UpdateHint(c.Request.Context(), hintID, &req)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *ChallengeHandler) DeleteHint(c *gin.Context) {
	hintID, err := strconv.Atoi(c.Param("hid"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid hint id"))
		return
	}
	if appErr := h.service.DeleteHint(c.Request.Context(), hintID); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *ChallengeHandler) PortalList(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}

	uid, _ := c.Get("user_id")
	userID, _ := uid.(int)

	teamID := 0
	if h.teamService != nil {
		if team, appErr := h.teamService.GetByUserID(c.Request.Context(), userID); appErr == nil {
			teamID = team.ID
		}
	}

	items, appErr := h.service.ListPortalChallenges(c.Request.Context(), compID, teamID)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, items)
}
