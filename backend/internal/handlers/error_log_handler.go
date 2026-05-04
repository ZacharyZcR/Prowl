package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type ErrorLogHandler struct {
	service *services.ErrorLogService
}

func NewErrorLogHandler(service *services.ErrorLogService) *ErrorLogHandler {
	return &ErrorLogHandler{service: service}
}

// List godoc
// @Summary 获取错误日志列表
// @Description 分页获取错误日志，支持按来源、类型、严重程度、状态过滤
// @Tags error-logs
// @Produce json
// @Security BearerAuth
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Param source query string false "来源: frontend/backend"
// @Param err_type query string false "错误类型"
// @Param severity query string false "严重程度: critical/high/medium/low"
// @Param resolved query bool false "是否已解决"
// @Param search query string false "搜索关键词"
// @Success 200 {object} response.Response{data=models.PaginatedResponse}
// @Failure 401 {object} response.Response
// @Failure 403 {object} response.Response
// @Router /error-logs [get]
func (h *ErrorLogHandler) List(c *gin.Context) {
	var q models.ErrorLogQuery
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

// GetByID godoc
// @Summary 获取错误日志详情
// @Description 根据 ID 获取错误日志详情
// @Tags error-logs
// @Produce json
// @Security BearerAuth
// @Param id path int true "错误日志 ID"
// @Success 200 {object} response.Response{data=models.ErrorLogResponse}
// @Failure 404 {object} response.Response
// @Router /error-logs/{id} [get]
func (h *ErrorLogHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid error log id"))
		return
	}

	l, appErr := h.service.GetByID(c.Request.Context(), id)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, services.BuildErrorLogResponse(l))
}

// Resolve godoc
// @Summary 标记错误已解决
// @Description 将指定错误日志标记为已解决
// @Tags error-logs
// @Produce json
// @Security BearerAuth
// @Param id path int true "错误日志 ID"
// @Success 200 {object} response.Response
// @Failure 404 {object} response.Response
// @Router /error-logs/{id}/resolve [put]
func (h *ErrorLogHandler) Resolve(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid error log id"))
		return
	}

	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	if appErr := h.service.Resolve(c.Request.Context(), id, uid); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, nil)
}

// Unresolve godoc
// @Summary 重新打开错误
// @Description 将已解决的错误日志重新打开
// @Tags error-logs
// @Produce json
// @Security BearerAuth
// @Param id path int true "错误日志 ID"
// @Success 200 {object} response.Response
// @Failure 404 {object} response.Response
// @Router /error-logs/{id}/unresolve [put]
func (h *ErrorLogHandler) Unresolve(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid error log id"))
		return
	}

	if appErr := h.service.Unresolve(c.Request.Context(), id); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, nil)
}

// BulkResolve godoc
// @Summary 批量解决错误
// @Description 批量将错误日志标记为已解决
// @Tags error-logs
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body models.BulkResolveRequest true "批量解决请求"
// @Success 200 {object} response.Response
// @Failure 400 {object} response.Response
// @Router /error-logs/bulk-resolve [post]
func (h *ErrorLogHandler) BulkResolve(c *gin.Context) {
	var req models.BulkResolveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	if appErr := h.service.BulkResolve(c.Request.Context(), req.IDs, uid); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, nil)
}

// Statistics godoc
// @Summary 获取错误日志统计
// @Description 获取错误日志的统计信息
// @Tags error-logs
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response{data=models.ErrorLogStats}
// @Failure 401 {object} response.Response
// @Router /error-logs/statistics [get]
func (h *ErrorLogHandler) Statistics(c *gin.Context) {
	stats, err := h.service.Statistics(c.Request.Context())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, stats)
}

// Report godoc
// @Summary 前端上报错误
// @Description 前端上报错误信息，认证后即可调用
// @Tags error-logs
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body models.ReportErrorRequest true "上报错误请求"
// @Success 200 {object} response.Response
// @Failure 400 {object} response.Response
// @Router /error-logs/report [post]
func (h *ErrorLogHandler) Report(c *gin.Context) {
	var req models.ReportErrorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	go h.service.Record(c.Request.Context(), &services.RecordInput{
		Source:  "frontend",
		ErrType: req.Type,
		Message: req.Message,
		Stack:   req.Stack,
		URL:     req.URL,
		UserID:  uid,
	})

	response.Success(c, nil)
}
