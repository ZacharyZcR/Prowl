package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type CompetitionHandler struct {
	service     *services.CompetitionService
	teamService *services.TeamService
}

func NewCompetitionHandler(service *services.CompetitionService, teamService *services.TeamService) *CompetitionHandler {
	return &CompetitionHandler{service: service, teamService: teamService}
}

func (h *CompetitionHandler) List(c *gin.Context) {
	var q models.CompetitionListQuery
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

func (h *CompetitionHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	resp, appErr := h.service.GetByID(c.Request.Context(), id)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, resp)
}

func (h *CompetitionHandler) Create(c *gin.Context) {
	var req models.CreateCompetitionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)
	usernameVal, _ := c.Get("username")
	username, _ := usernameVal.(string)

	comp, err := h.service.Create(c.Request.Context(), &req, uid, username, c.ClientIP())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}
	response.Success(c, gin.H{"id": comp.ID, "title": comp.Title})
}

func (h *CompetitionHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	var req models.UpdateCompetitionRequest
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

func (h *CompetitionHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
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

func (h *CompetitionHandler) UpdateStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	var req models.CompetitionStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)
	usernameVal, _ := c.Get("username")
	username, _ := usernameVal.(string)

	if appErr := h.service.UpdateStatus(c.Request.Context(), id, req.Status, uid, username, c.ClientIP()); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *CompetitionHandler) AttachChallenge(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	var req models.AttachChallengeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	if appErr := h.service.AttachChallenge(c.Request.Context(), id, &req); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *CompetitionHandler) DetachChallenge(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	cid, err := strconv.Atoi(c.Param("cid"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid challenge id"))
		return
	}
	if appErr := h.service.DetachChallenge(c.Request.Context(), id, cid); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *CompetitionHandler) ListRegistrations(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	regs, appErr := h.service.ListRegistrations(c.Request.Context(), id)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, regs)
}

func (h *CompetitionHandler) ReviewRegistration(c *gin.Context) {
	rid, err := strconv.Atoi(c.Param("rid"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid registration id"))
		return
	}
	var req models.RegistrationReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	if appErr := h.service.ReviewRegistration(c.Request.Context(), rid, req.Status); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *CompetitionHandler) BatchAttach(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	var req models.BatchAttachRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	attached, appErr := h.service.BatchAttachChallenges(c.Request.Context(), id, req.Challenges)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, gin.H{"attached": attached})
}

func (h *CompetitionHandler) ReleaseChallenges(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	var req models.ReleaseChallengesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	released, appErr := h.service.ReleaseChallenges(c.Request.Context(), id, req.ChallengeIDs)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, gin.H{"released": released})
}

func (h *CompetitionHandler) ListChallenges(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	items, appErr := h.service.ListCompetitionChallenges(c.Request.Context(), id)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, items)
}

func (h *CompetitionHandler) ListPublic(c *gin.Context) {
	var q models.CompetitionListQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid query parameters"))
		return
	}
	teamID := h.resolveTeamID(c)
	result, err := h.service.ListPublicForTeam(c.Request.Context(), &q, teamID)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}
	response.Success(c, result)
}

func (h *CompetitionHandler) PortalGetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	teamID := h.resolveTeamID(c)
	resp, appErr := h.service.GetByIDForTeam(c.Request.Context(), id, teamID)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, resp)
}

func (h *CompetitionHandler) resolveTeamID(c *gin.Context) int {
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)
	if uid == 0 {
		return 0
	}
	if h.teamService == nil {
		return 0
	}
	team, err := h.teamService.GetByUserID(c.Request.Context(), uid)
	if err != nil {
		return 0
	}
	return team.ID
}
