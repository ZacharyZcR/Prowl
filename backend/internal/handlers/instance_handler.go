package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type InstanceHandler struct {
	instanceService *services.InstanceService
	teamService     *services.TeamService
}

func NewInstanceHandler(instanceService *services.InstanceService, teamService *services.TeamService) *InstanceHandler {
	return &InstanceHandler{instanceService: instanceService, teamService: teamService}
}

func (h *InstanceHandler) List(c *gin.Context) {
	var q models.InstanceListQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid query parameters"))
		return
	}
	result, err := h.instanceService.ListInstances(c.Request.Context(), &q)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}
	response.Success(c, result)
}

func (h *InstanceHandler) Stats(c *gin.Context) {
	stats, err := h.instanceService.GetStats(c.Request.Context())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}
	response.Success(c, stats)
}

func (h *InstanceHandler) Detail(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid instance id"))
		return
	}
	resp, appErr := h.instanceService.GetInstance(c.Request.Context(), id)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, resp)
}

func (h *InstanceHandler) ForceRemove(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid instance id"))
		return
	}
	if appErr := h.instanceService.ForceRemove(c.Request.Context(), id); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *InstanceHandler) PortalStart(c *gin.Context) {
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

	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	myTeam, appErr := h.teamService.GetByUserID(c.Request.Context(), uid)
	if appErr != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("you must be in a team"))
		return
	}

	resp, appErr := h.instanceService.StartInstance(c.Request.Context(), chalID, compID, myTeam.ID)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, resp)
}

func (h *InstanceHandler) PortalStop(c *gin.Context) {
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

	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	myTeam, appErr := h.teamService.GetByUserID(c.Request.Context(), uid)
	if appErr != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("you must be in a team"))
		return
	}

	if appErr := h.instanceService.StopInstance(c.Request.Context(), chalID, compID, myTeam.ID); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *InstanceHandler) PortalStatus(c *gin.Context) {
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

	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	myTeam, appErr := h.teamService.GetByUserID(c.Request.Context(), uid)
	if appErr != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("you must be in a team"))
		return
	}

	resp, appErr := h.instanceService.GetInstanceStatus(c.Request.Context(), chalID, compID, myTeam.ID)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, resp)
}
