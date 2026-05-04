package handlers

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type ActivityHandler struct {
	activityService *services.ActivityService
}

func NewActivityHandler(activityService *services.ActivityService) *ActivityHandler {
	return &ActivityHandler{activityService: activityService}
}

// List godoc
// @Summary 获取操作日志列表
// @Description 分页获取操作日志，支持按资源类型、用户和动作过滤
// @Tags activities
// @Produce json
// @Security BearerAuth
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Param resource_type query string false "资源类型"
// @Param user_id query int false "用户 ID"
// @Param action query string false "动作类型"
// @Success 200 {object} response.Response{data=models.PaginatedResponse}
// @Failure 401 {object} response.Response
// @Router /activities [get]
func (h *ActivityHandler) List(c *gin.Context) {
	var q models.ActivityListQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid query parameters"))
		return
	}

	result, err := h.activityService.List(c.Request.Context(), &q)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, result)
}

// Statistics godoc
// @Summary 获取操作日志统计
// @Description 获取操作日志的统计信息，包括总数、今日数量、按动作和资源类型分组
// @Tags activities
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response{data=services.ActivityStats}
// @Failure 401 {object} response.Response
// @Router /activities/statistics [get]
func (h *ActivityHandler) Statistics(c *gin.Context) {
	stats, err := h.activityService.Statistics(c.Request.Context())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, stats)
}

// Export godoc
// @Summary 导出操作日志 CSV
// @Description 导出操作日志为 CSV 文件，支持过滤
// @Tags activities
// @Produce text/csv
// @Security BearerAuth
// @Param resource_type query string false "资源类型"
// @Param user_id query int false "用户 ID"
// @Param action query string false "动作类型"
// @Success 200 {file} file
// @Failure 401 {object} response.Response
// @Router /activities/export [get]
func (h *ActivityHandler) Export(c *gin.Context) {
	var q models.ActivityListQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid query parameters"))
		return
	}

	data, err := h.activityService.Export(c.Request.Context(), &q)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	filename := fmt.Sprintf("activities_%s.csv", time.Now().Format("20060102_150405"))
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Data(200, "text/csv; charset=utf-8", data)
}
