package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/apikey"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type APIKeyService struct {
	client *ent.Client
}

func NewAPIKeyService(client *ent.Client) *APIKeyService {
	return &APIKeyService{client: client}
}

// Generate 生成新 API Key，返回明文（仅此一次）和记录
func (s *APIKeyService) Generate(ctx context.Context, name string, userID int, expiresAt *time.Time) (string, *ent.ApiKey, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", nil, apperr.ErrInternal.WithMessage("failed to generate random bytes: " + err.Error())
	}
	plainKey := "stc_" + hex.EncodeToString(raw)
	prefix := plainKey[:8]

	hash := sha256.Sum256([]byte(plainKey))
	keyHash := hex.EncodeToString(hash[:])

	builder := s.client.ApiKey.Create().
		SetName(name).
		SetKeyHash(keyHash).
		SetKeyPrefix(prefix).
		SetUserID(userID)

	if expiresAt != nil {
		builder = builder.SetExpiresAt(*expiresAt)
	}

	record, err := builder.Save(ctx)
	if err != nil {
		return "", nil, apperr.ErrInternal.WithMessage("failed to create api key: " + err.Error())
	}

	return plainKey, record, nil
}

// Validate 验证 API Key
func (s *APIKeyService) Validate(ctx context.Context, key string) (*ent.ApiKey, error) {
	hash := sha256.Sum256([]byte(key))
	keyHash := hex.EncodeToString(hash[:])

	record, err := s.client.ApiKey.Query().
		Where(apikey.KeyHash(keyHash)).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrUnauthorized.WithMessage("invalid api key")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to validate api key: " + err.Error())
	}

	if !record.Enabled {
		return nil, apperr.ErrUnauthorized.WithMessage("api key is disabled")
	}

	if record.ExpiresAt != nil && record.ExpiresAt.Before(time.Now()) {
		return nil, apperr.ErrUnauthorized.WithMessage("api key has expired")
	}

	// 更新 last_used_at
	now := time.Now()
	_ = s.client.ApiKey.UpdateOneID(record.ID).SetLastUsedAt(now).Exec(ctx)

	return record, nil
}

// List 列出用户的 API Key
func (s *APIKeyService) List(ctx context.Context, userID int) ([]*ent.ApiKey, error) {
	items, err := s.client.ApiKey.Query().
		Where(apikey.UserID(userID)).
		Order(ent.Desc(apikey.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list api keys: " + err.Error())
	}
	return items, nil
}

// Revoke 吊销 API Key
func (s *APIKeyService) Revoke(ctx context.Context, id int, userID int) error {
	record, err := s.client.ApiKey.Get(ctx, id)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("api key not found")
		}
		return apperr.ErrInternal.WithMessage("failed to get api key: " + err.Error())
	}

	if record.UserID != userID {
		return apperr.ErrForbidden.WithMessage("cannot revoke other user's api key")
	}

	if err := s.client.ApiKey.DeleteOneID(id).Exec(ctx); err != nil {
		return apperr.ErrInternal.WithMessage("failed to revoke api key: " + err.Error())
	}
	return nil
}
