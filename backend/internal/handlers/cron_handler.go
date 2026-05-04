package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type CronHandler struct {
	cronService *services.CronService
}

func NewCronHandler(cronService *services.CronService) *CronHandler {
	return &CronHandler{cronService: cronService}
}

func (h *CronHandler) List(c *gin.Context) {
	items, err := h.cronService.List(c.Request.Context())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	result := make([]models.CronJobResponse, 0, len(items))
	for _, item := range items {
		result = append(result, toCronJobResponse(item))
	}

	response.Success(c, result)
}

func (h *CronHandler) Create(c *gin.Context) {
	var req models.CreateCronJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	job, err := h.cronService.Create(c.Request.Context(), &req)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, toCronJobResponse(job))
}

func (h *CronHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid cron job id"))
		return
	}

	var req models.UpdateCronJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	job, appErr := h.cronService.Update(c.Request.Context(), id, &req)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, toCronJobResponse(job))
}

func (h *CronHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid cron job id"))
		return
	}

	if appErr := h.cronService.Delete(c.Request.Context(), id); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, nil)
}

func (h *CronHandler) Toggle(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid cron job id"))
		return
	}

	if appErr := h.cronService.Toggle(c.Request.Context(), id); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, nil)
}

func (h *CronHandler) RunNow(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid cron job id"))
		return
	}

	if appErr := h.cronService.RunNow(c.Request.Context(), id); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, nil)
}

func toCronJobResponse(job *ent.CronJob) models.CronJobResponse {
	resp := models.CronJobResponse{
		ID:         job.ID,
		Name:       job.Name,
		CronExpr:   job.CronExpr,
		Handler:    job.Handler,
		Enabled:    job.Enabled,
		LastStatus: job.LastStatus,
		LastError:  job.LastError,
		CreatedAt:  job.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:  job.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}

	if job.LastRunAt != nil {
		resp.LastRunAt = job.LastRunAt.Format("2006-01-02T15:04:05Z")
	}
	if job.NextRunAt != nil {
		resp.NextRunAt = job.NextRunAt.Format("2006-01-02T15:04:05Z")
	}

	return resp
}
