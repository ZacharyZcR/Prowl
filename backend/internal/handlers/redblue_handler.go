package handlers

import (
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type RedBlueHandler struct {
	service     *services.RedBlueService
	teamService *services.TeamService
}

func NewRedBlueHandler(service *services.RedBlueService, teamService *services.TeamService) *RedBlueHandler {
	return &RedBlueHandler{service: service, teamService: teamService}
}

func (h *RedBlueHandler) SubmitAttackReport(c *gin.Context) {
	compID, _ := strconv.Atoi(c.Param("id"))
	var req models.CreateAttackReportRequest
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
	r, appErr := h.service.CreateAttackReport(c.Request.Context(), compID, myTeam.ID, uid, &req)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, gin.H{"id": r.ID})
}

func (h *RedBlueHandler) SubmitDefenseReport(c *gin.Context) {
	compID, _ := strconv.Atoi(c.Param("id"))
	var req models.CreateDefenseReportRequest
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
	r, appErr := h.service.CreateDefenseReport(c.Request.Context(), compID, myTeam.ID, uid, &req)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, gin.H{"id": r.ID})
}

func (h *RedBlueHandler) ListAttackReports(c *gin.Context) {
	compID, _ := strconv.Atoi(c.Param("id"))
	if !h.requirePortalJudge(c, compID) {
		return
	}
	var q models.ReportListQuery
	_ = c.ShouldBindQuery(&q)
	result, appErr := h.service.ListAttackReports(c.Request.Context(), compID, &q)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, result)
}

func (h *RedBlueHandler) ListDefenseReports(c *gin.Context) {
	compID, _ := strconv.Atoi(c.Param("id"))
	if !h.requirePortalJudge(c, compID) {
		return
	}
	var q models.ReportListQuery
	_ = c.ShouldBindQuery(&q)
	result, appErr := h.service.ListDefenseReports(c.Request.Context(), compID, &q)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, result)
}

func (h *RedBlueHandler) JudgeAttackReport(c *gin.Context) {
	compID, _ := strconv.Atoi(c.Param("id"))
	if !h.requirePortalJudge(c, compID) {
		return
	}
	reportID, _ := strconv.Atoi(c.Param("rid"))
	var req models.JudgeReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)
	if appErr := h.service.JudgeAttackReport(c.Request.Context(), reportID, &req, uid); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *RedBlueHandler) JudgeDefenseReport(c *gin.Context) {
	compID, _ := strconv.Atoi(c.Param("id"))
	if !h.requirePortalJudge(c, compID) {
		return
	}
	reportID, _ := strconv.Atoi(c.Param("rid"))
	var req models.JudgeReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)
	if appErr := h.service.JudgeDefenseReport(c.Request.Context(), reportID, &req, uid); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *RedBlueHandler) ListPhases(c *gin.Context) {
	compID, _ := strconv.Atoi(c.Param("id"))
	items, appErr := h.service.ListPhases(c.Request.Context(), compID)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, items)
}

func (h *RedBlueHandler) CreatePhase(c *gin.Context) {
	compID, _ := strconv.Atoi(c.Param("id"))
	if !h.requirePortalJudge(c, compID) {
		return
	}
	var req models.CreatePhaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	p, appErr := h.service.CreatePhase(c.Request.Context(), compID, &req)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, gin.H{"id": p.ID})
}

func (h *RedBlueHandler) AdvancePhase(c *gin.Context) {
	compID, _ := strconv.Atoi(c.Param("id"))
	if !h.requirePortalJudge(c, compID) {
		return
	}
	if appErr := h.service.AdvancePhase(c.Request.Context(), compID); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, gin.H{"message": "phase advanced"})
}

func (h *RedBlueHandler) MyAttackReports(c *gin.Context) {
	compID, _ := strconv.Atoi(c.Param("id"))
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)
	myTeam, appErr := h.teamService.GetByUserID(c.Request.Context(), uid)
	if appErr != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("you must be in a team"))
		return
	}
	q := &models.ReportListQuery{Page: 1, PageSize: 100, TeamID: myTeam.ID}
	result, appErr := h.service.ListAttackReports(c.Request.Context(), compID, q)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, result)
}

func (h *RedBlueHandler) requirePortalJudge(c *gin.Context, compID int) bool {
	if !strings.Contains(c.FullPath(), "/portal/") {
		return true
	}
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)
	myTeam, appErr := h.teamService.GetByUserID(c.Request.Context(), uid)
	if appErr != nil {
		response.AppError(c, apperr.ErrForbidden.WithMessage("judge team required"))
		return false
	}
	if appErr := h.service.EnsureJudgeRole(c.Request.Context(), compID, myTeam.ID); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return false
	}
	return true
}

func (h *RedBlueHandler) MyDefenseReports(c *gin.Context) {
	compID, _ := strconv.Atoi(c.Param("id"))
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)
	myTeam, appErr := h.teamService.GetByUserID(c.Request.Context(), uid)
	if appErr != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("you must be in a team"))
		return
	}
	q := &models.ReportListQuery{Page: 1, PageSize: 100, TeamID: myTeam.ID}
	result, appErr := h.service.ListDefenseReports(c.Request.Context(), compID, q)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, result)
}

func (h *RedBlueHandler) GetExerciseSummary(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	result, appErr := h.service.GenerateSummary(c.Request.Context(), compID)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, result)
}
