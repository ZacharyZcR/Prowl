package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type NotificationHandler struct {
	notifService *services.NotificationService
}

func NewNotificationHandler(notifService *services.NotificationService) *NotificationHandler {
	return &NotificationHandler{notifService: notifService}
}

// List godoc
// @Summary 查询通知列表
// @Description 查询当前用户的通知列表，支持分页和仅未读过滤
// @Tags notification
// @Produce json
// @Security BearerAuth
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Param unread_only query bool false "仅未读" default(false)
// @Success 200 {object} response.Response{data=models.PaginatedResponse}
// @Failure 401 {object} response.Response
// @Router /notifications [get]
func (h *NotificationHandler) List(c *gin.Context) {
	userID := c.GetInt("user_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	unreadOnly, _ := strconv.ParseBool(c.DefaultQuery("unread_only", "false"))

	result, err := h.notifService.List(c.Request.Context(), userID, page, pageSize, unreadOnly)
	if err != nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("failed to list notifications"))
		return
	}
	response.Success(c, result)
}

// Create godoc
// @Summary 创建通知
// @Description 创建通知并实时推送给目标用户（需 notification:create 权限）
// @Tags notification
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body models.CreateNotificationRequest true "创建通知请求"
// @Success 200 {object} response.Response
// @Failure 400 {object} response.Response
// @Failure 401 {object} response.Response
// @Failure 403 {object} response.Response
// @Router /notifications [post]
func (h *NotificationHandler) Create(c *gin.Context) {
	var req models.CreateNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request"))
		return
	}

	if err := h.notifService.Create(c.Request.Context(), req.UserID, req.Title, req.Content, req.Type); err != nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("failed to create notification"))
		return
	}
	response.Success(c, nil)
}

// MarkRead godoc
// @Summary 标记通知已读
// @Description 标记指定通知为已读
// @Tags notification
// @Produce json
// @Security BearerAuth
// @Param id path int true "通知 ID"
// @Success 200 {object} response.Response
// @Failure 401 {object} response.Response
// @Router /notifications/{id}/read [put]
func (h *NotificationHandler) MarkRead(c *gin.Context) {
	userID := c.GetInt("user_id")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid id"))
		return
	}

	if err := h.notifService.MarkRead(c.Request.Context(), id, userID); err != nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("failed to mark read"))
		return
	}
	response.Success(c, nil)
}

// MarkAllRead godoc
// @Summary 全部标记已读
// @Description 将当前用户所有未读通知标记为已读
// @Tags notification
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response
// @Failure 401 {object} response.Response
// @Router /notifications/read-all [put]
func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	userID := c.GetInt("user_id")
	if err := h.notifService.MarkAllRead(c.Request.Context(), userID); err != nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("failed to mark all read"))
		return
	}
	response.Success(c, nil)
}

// UnreadCount godoc
// @Summary 获取未读通知数量
// @Description 返回当前用户的未读通知数量
// @Tags notification
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response{data=int}
// @Failure 401 {object} response.Response
// @Router /notifications/unread-count [get]
func (h *NotificationHandler) UnreadCount(c *gin.Context) {
	userID := c.GetInt("user_id")
	count, err := h.notifService.UnreadCount(c.Request.Context(), userID)
	if err != nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("failed to count unread"))
		return
	}
	response.Success(c, gin.H{"count": count})
}
