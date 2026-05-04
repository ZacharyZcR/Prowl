package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type ScenarioHandler struct {
	service *services.ScenarioService
}

func NewScenarioHandler(service *services.ScenarioService) *ScenarioHandler {
	return &ScenarioHandler{service: service}
}

func (h *ScenarioHandler) ListScenarios(c *gin.Context) {
	var q models.ScenarioListQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid query"))
		return
	}
	result, err := h.service.ListScenarios(c.Request.Context(), &q)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}
	response.Success(c, result)
}

func (h *ScenarioHandler) GetScenario(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid id"))
		return
	}
	resp, appErr := h.service.GetScenario(c.Request.Context(), id)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, resp)
}

func (h *ScenarioHandler) CreateScenario(c *gin.Context) {
	var req models.CreateScenarioRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)
	usernameVal, _ := c.Get("username")
	username, _ := usernameVal.(string)

	sc, err := h.service.CreateScenario(c.Request.Context(), &req, uid, username, c.ClientIP())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}
	response.Success(c, gin.H{"id": sc.ID, "name": sc.Name})
}

func (h *ScenarioHandler) UpdateScenario(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid id"))
		return
	}
	var req models.UpdateScenarioRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	_, appErr := h.service.UpdateScenario(c.Request.Context(), id, &req)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *ScenarioHandler) DeleteScenario(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid id"))
		return
	}
	if appErr := h.service.DeleteScenario(c.Request.Context(), id); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *ScenarioHandler) ListObjectives(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	teamRole := c.Query("team_role")
	teamID, _ := strconv.Atoi(c.Query("team_id"))

	objs, appErr := h.service.ListObjectives(c.Request.Context(), compID, teamRole, teamID)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, objs)
}

func (h *ScenarioHandler) CreateObjective(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	var req models.CreateObjectiveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	obj, appErr := h.service.CreateObjective(c.Request.Context(), compID, &req)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, gin.H{"id": obj.ID})
}

func (h *ScenarioHandler) JudgeObjective(c *gin.Context) {
	objID, err := strconv.Atoi(c.Param("oid"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid objective id"))
		return
	}
	var req models.JudgeObjectiveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	if appErr := h.service.JudgeObjective(c.Request.Context(), objID, &req, uid); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *ScenarioHandler) JudgeScore(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	var req models.JudgeScoreRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	if appErr := h.service.JudgeScore(c.Request.Context(), compID, &req, uid); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *ScenarioHandler) BatchCreateObjectives(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	var req models.BatchCreateObjectivesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	count, appErr := h.service.BatchCreateObjectives(c.Request.Context(), compID, req.Objectives)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, gin.H{"created": count})
}

func (h *ScenarioHandler) AssignObjective(c *gin.Context) {
	objID, err := strconv.Atoi(c.Param("oid"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid objective id"))
		return
	}
	var req models.AssignObjectiveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	if appErr := h.service.AssignObjective(c.Request.Context(), objID, req.TeamID); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *ScenarioHandler) AutoAssignObjectives(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	var req models.AutoAssignObjectivesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	count, appErr := h.service.AutoAssignObjectives(c.Request.Context(), compID, &req)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, gin.H{"assigned": count})
}

func (h *ScenarioHandler) SubmitEvidence(c *gin.Context) {
	objID, err := strconv.Atoi(c.Param("oid"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid objective id"))
		return
	}
	var req models.CompleteObjectiveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)
	req.UserID = uid

	if appErr := h.service.SubmitObjectiveEvidence(c.Request.Context(), objID, &req); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}
