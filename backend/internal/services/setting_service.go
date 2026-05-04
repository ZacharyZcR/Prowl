package services

import (
	"context"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/setting"
	"github.com/ZacharyZcR/STC/backend/internal/models"
)

const secretMask = "••••••"

type SettingService struct {
	client *ent.Client
}

func NewSettingService(client *ent.Client) *SettingService {
	return &SettingService{client: client}
}

// ListByGroup returns all settings grouped by group_name, sorted by sort_order.
func (s *SettingService) ListByGroup(ctx context.Context) ([]models.SettingGroupResponse, error) {
	all, err := s.client.Setting.Query().
		Order(ent.Asc(setting.FieldGroupName), ent.Asc(setting.FieldSortOrder)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	groupMap := make(map[string][]models.SettingItemResponse)
	var groupOrder []string

	for _, st := range all {
		if _, seen := groupMap[st.GroupName]; !seen {
			groupOrder = append(groupOrder, st.GroupName)
		}
		item := toSettingItem(st)
		groupMap[st.GroupName] = append(groupMap[st.GroupName], item)
	}

	result := make([]models.SettingGroupResponse, 0, len(groupOrder))
	for _, g := range groupOrder {
		result = append(result, models.SettingGroupResponse{
			GroupName: g,
			Settings:  groupMap[g],
		})
	}
	return result, nil
}

// Get returns a single setting value by key.
func (s *SettingService) Get(ctx context.Context, key string) (string, error) {
	st, err := s.client.Setting.Query().Where(setting.Key(key)).Only(ctx)
	if err != nil {
		return "", err
	}
	return st.Value, nil
}

// GetByGroup returns settings for a specific group.
func (s *SettingService) GetByGroup(ctx context.Context, group string) ([]models.SettingItemResponse, error) {
	all, err := s.client.Setting.Query().
		Where(setting.GroupName(group)).
		Order(ent.Asc(setting.FieldSortOrder)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	items := make([]models.SettingItemResponse, 0, len(all))
	for _, st := range all {
		items = append(items, toSettingItem(st))
	}
	return items, nil
}

// Update batch-updates settings by key. Secret values equal to the mask are skipped.
func (s *SettingService) Update(ctx context.Context, updates map[string]string) error {
	for key, val := range updates {
		if val == secretMask {
			continue
		}
		_, err := s.client.Setting.Update().
			Where(setting.Key(key)).
			SetValue(val).
			Save(ctx)
		if err != nil {
			return err
		}
	}
	return nil
}

func toSettingItem(st *ent.Setting) models.SettingItemResponse {
	value := st.Value
	if st.IsSecret && value != "" {
		value = secretMask
	}
	return models.SettingItemResponse{
		Key:          st.Key,
		Value:        value,
		DisplayName:  st.DisplayName,
		Description:  st.Description,
		ValueType:    st.ValueType,
		DefaultValue: st.DefaultValue,
		IsSecret:     st.IsSecret,
	}
}
