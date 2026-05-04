package services

import (
	"context"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/user"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type AuthService struct {
	client    *ent.Client
	jwtSecret []byte
	rdb       *redis.Client
}

func NewAuthService(client *ent.Client, jwtSecret string, rdb *redis.Client) *AuthService {
	return &AuthService{client: client, jwtSecret: []byte(jwtSecret), rdb: rdb}
}

type LoginResult struct {
	Token string
	User  *ent.User
}

func (s *AuthService) Login(ctx context.Context, username, password string) (*LoginResult, error) {
	u, err := s.client.User.Query().Where(user.Username(username)).WithRole().Only(ctx)
	if err != nil {
		return nil, apperr.ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password)); err != nil {
		return nil, apperr.ErrInvalidCredentials
	}

	roleName := ""
	if u.Edges.Role != nil {
		roleName = u.Edges.Role.Name
	}

	now := time.Now()
	claims := models.UserClaims{
		UserID:   u.ID,
		Username: u.Username,
		Role:     roleName,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    "stc",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return nil, apperr.ErrInternal
	}

	return &LoginResult{Token: tokenStr, User: u}, nil
}

func (s *AuthService) GenerateToken(userID int, username, role string) (string, error) {
	now := time.Now()
	claims := models.UserClaims{
		UserID:   userID,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    "stc",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func (s *AuthService) ValidateToken(tokenString string) (*models.UserClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &models.UserClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, apperr.ErrUnauthorized
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, apperr.ErrUnauthorized
	}

	claims, ok := token.Claims.(*models.UserClaims)
	if !ok || !token.Valid {
		return nil, apperr.ErrUnauthorized
	}

	return claims, nil
}

func (s *AuthService) ValidateAccessToken(ctx context.Context, tokenString string) (*models.UserClaims, error) {
	tokenString = strings.TrimSpace(tokenString)
	if tokenString == "" {
		return nil, apperr.ErrUnauthorized.WithMessage("missing token")
	}
	if s.IsTokenBlacklisted(ctx, tokenString) {
		return nil, apperr.ErrUnauthorized.WithMessage("token has been revoked")
	}
	return s.ValidateToken(tokenString)
}

func (s *AuthService) BlacklistToken(ctx context.Context, tokenStr string) error {
	if s.rdb == nil {
		return nil
	}
	claims, err := s.ValidateToken(tokenStr)
	if err != nil {
		return nil
	}
	ttl := time.Until(claims.ExpiresAt.Time)
	if ttl <= 0 {
		return nil
	}
	return s.rdb.Set(ctx, "jwt:blacklist:"+tokenStr, "1", ttl).Err()
}

func (s *AuthService) IsTokenBlacklisted(ctx context.Context, tokenStr string) bool {
	if s.rdb == nil {
		return false
	}
	val, _ := s.rdb.Get(ctx, "jwt:blacklist:"+tokenStr).Result()
	return val == "1"
}

func (s *AuthService) GetPermissions(ctx context.Context, userID int) ([]string, error) {
	u, err := s.client.User.Query().Where(user.ID(userID)).WithRole().Only(ctx)
	if err != nil {
		return nil, apperr.ErrUnauthorized.WithMessage("user not found")
	}

	perms := []string{}
	if u.Edges.Role != nil && u.Edges.Role.Permissions != nil {
		perms = append(perms, u.Edges.Role.Permissions...)
	}
	return perms, nil
}
