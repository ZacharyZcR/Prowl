package handlers

import (
	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/ent"
	entRole "github.com/ZacharyZcR/STC/backend/ent/role"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type PortalAuthHandler struct {
	userService *services.UserService
	authService *services.AuthService
	client      *ent.Client
}

func NewPortalAuthHandler(userService *services.UserService, authService *services.AuthService, client *ent.Client) *PortalAuthHandler {
	return &PortalAuthHandler{userService: userService, authService: authService, client: client}
}

type PortalRegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Password string `json:"password" binding:"required,min=6"`
	Email    string `json:"email" binding:"omitempty,email"`
}

func (h *PortalAuthHandler) Register(c *gin.Context) {
	var req PortalRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	participantRole, err := h.client.Role.Query().Where(entRole.Name("participant")).Only(c.Request.Context())
	if err != nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("participant role not found, please seed database first"))
		return
	}

	createReq := &models.CreateUserRequest{
		Username: req.Username,
		Password: req.Password,
		Email:    req.Email,
		RoleID:   participantRole.ID,
	}

	user, appErr := h.userService.Create(c.Request.Context(), createReq)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	token, err := h.authService.GenerateToken(user.ID, user.Username, participantRole.Name)
	if err != nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("failed to generate token"))
		return
	}

	response.Success(c, gin.H{
		"token": token,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"nickname": user.Nickname,
			"email":    user.Email,
		},
	})
}
