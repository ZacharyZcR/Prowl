package handlers

import (
	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type LoginLogHandler struct {
	loginLogService *services.LoginLogService
}

func NewLoginLogHandler(s *services.LoginLogService) *LoginLogHandler {
	return &LoginLogHandler{loginLogService: s}
}

// List godoc
// @Summary 获取登录日志列表
// @Description 分页获取登录日志，支持按用户名、IP、成功状态过滤
// @Tags login-logs
// @Produce json
// @Security BearerAuth
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Param username query string false "用户名"
// @Param ip query string false "IP 地址"
// @Param success query string false "成功状态 true/false"
// @Success 200 {object} response.Response{data=models.PaginatedResponse}
// @Failure 401 {object} response.Response
// @Router /login-logs [get]
func (h *LoginLogHandler) List(c *gin.Context) {
	var q models.LoginLogListQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid query parameters"))
		return
	}

	result, err := h.loginLogService.List(c.Request.Context(), &q)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, result)
}

// Statistics godoc
// @Summary 获取登录日志统计
// @Description 获取登录日志的统计信息
// @Tags login-logs
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response{data=services.LoginLogStats}
// @Failure 401 {object} response.Response
// @Router /login-logs/statistics [get]
func (h *LoginLogHandler) Statistics(c *gin.Context) {
	stats, err := h.loginLogService.Statistics(c.Request.Context())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, stats)
}
