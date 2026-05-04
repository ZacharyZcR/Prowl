package models

import "github.com/golang-jwt/jwt/v5"

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

type UserResponse struct {
	ID        int           `json:"id"`
	Username  string        `json:"username"`
	Email     string        `json:"email"`
	Nickname  string        `json:"nickname"`
	Role      *RoleResponse `json:"role,omitempty"`
	CreatedAt string        `json:"created_at"`
}

type UserClaims struct {
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}
