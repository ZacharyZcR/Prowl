package handlers

import (
	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/services"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type HealthMonitorHandler struct {
	service *services.HealthService
}

func NewHealthMonitorHandler(service *services.HealthService) *HealthMonitorHandler {
	return &HealthMonitorHandler{service: service}
}

// SystemHealth godoc
// @Summary 系统健康监控
// @Description 返回完整系统健康信息，包含各组件状态
// @Tags system
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /health/monitor [get]
func (h *HealthMonitorHandler) SystemHealth(c *gin.Context) {
	health, err := h.service.Check(c.Request.Context(), Version)
	if err != nil {
		response.Error(c, 500, err.Error())
		return
	}
	response.Success(c, health)
}

// Metrics godoc
// @Summary 请求指标汇总
// @Description 返回请求指标统计数据
// @Tags system
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /health/metrics [get]
func (h *HealthMonitorHandler) Metrics(c *gin.Context) {
	summary, err := h.service.GetMetricsSummary()
	if err != nil {
		response.Error(c, 500, err.Error())
		return
	}
	response.Success(c, summary)
}
