package services

import (
	"context"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/userpreference"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type PreferenceService struct {
	client *ent.Client
}

func NewPreferenceService(client *ent.Client) *PreferenceService {
	return &PreferenceService{client: client}
}

// Get 获取单个偏好
func (s *PreferenceService) Get(ctx context.Context, userID int, key string) (string, error) {
	pref, err := s.client.UserPreference.Query().
		Where(userpreference.UserID(userID), userpreference.Key(key)).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return "", nil
		}
		return "", apperr.ErrInternal.WithMessage("failed to get preference: " + err.Error())
	}
	return pref.Value, nil
}

// GetAll 获取用户所有偏好
func (s *PreferenceService) GetAll(ctx context.Context, userID int) (map[string]string, error) {
	items, err := s.client.UserPreference.Query().
		Where(userpreference.UserID(userID)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to get preferences: " + err.Error())
	}

	result := make(map[string]string, len(items))
	for _, item := range items {
		result[item.Key] = item.Value
	}
	return result, nil
}

// Set 设置偏好（upsert）
func (s *PreferenceService) Set(ctx context.Context, userID int, key, value string) error {
	// 先查是否存在
	existing, err := s.client.UserPreference.Query().
		Where(userpreference.UserID(userID), userpreference.Key(key)).
		Only(ctx)
	if err != nil && !ent.IsNotFound(err) {
		return apperr.ErrInternal.WithMessage("failed to query preference: " + err.Error())
	}

	if existing != nil {
		_, err = existing.Update().SetValue(value).Save(ctx)
	} else {
		_, err = s.client.UserPreference.Create().
			SetUserID(userID).
			SetKey(key).
			SetValue(value).
			Save(ctx)
	}
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to set preference: " + err.Error())
	}
	return nil
}

// SetBatch 批量设置
func (s *PreferenceService) SetBatch(ctx context.Context, userID int, prefs map[string]string) error {
	for key, value := range prefs {
		if err := s.Set(ctx, userID, key, value); err != nil {
			return err
		}
	}
	return nil
}
