package handlers

import (
	"context"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type AuthHandler struct {
	authService     *services.AuthService
	loginLogService *services.LoginLogService
}

func NewAuthHandler(s *services.AuthService, lls *services.LoginLogService) *AuthHandler {
	return &AuthHandler{authService: s, loginLogService: lls}
}

// Login godoc
// @Summary 用户登录
// @Description 使用用户名密码登录，返回 JWT
// @Tags auth
// @Accept json
// @Produce json
// @Param request body models.LoginRequest true "登录请求"
// @Success 200 {object} response.Response{data=models.LoginResponse}
// @Failure 400 {object} response.Response
// @Failure 401 {object} response.Response
// @Router /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request"))
		return
	}

	result, err := h.authService.Login(c.Request.Context(), req.Username, req.Password)
	if err != nil {
		recordCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		_ = h.loginLogService.Record(recordCtx, &services.LoginLogInput{
			Username:      req.Username,
			IP:            c.ClientIP(),
			UserAgent:     c.Request.UserAgent(),
			Success:       false,
			FailureReason: "invalid_credentials",
		})
		response.AppError(c, apperr.ErrInvalidCredentials)
		return
	}

	recordCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	_ = h.loginLogService.Record(recordCtx, &services.LoginLogInput{
		UserID:    result.User.ID,
		Username:  req.Username,
		IP:        c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		Success:   true,
	})

	response.Success(c, models.LoginResponse{
		Token: result.Token,
		User:  services.BuildUserResponse(result.User),
	})
}

// Logout godoc
// @Summary 用户登出
// @Description 登出当前用户
// @Tags auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response
// @Router /auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	if header := c.GetHeader("Authorization"); header != "" {
		parts := strings.SplitN(header, " ", 2)
		if len(parts) == 2 && parts[0] == "Bearer" {
			_ = h.authService.BlacklistToken(c.Request.Context(), parts[1])
		}
	}
	response.Success(c, nil)
}
