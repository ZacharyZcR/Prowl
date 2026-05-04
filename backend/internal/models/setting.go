package models

type SettingGroupResponse struct {
	GroupName string                `json:"group_name"`
	Settings  []SettingItemResponse `json:"settings"`
}

type SettingItemResponse struct {
	Key          string `json:"key"`
	Value        string `json:"value"`
	DisplayName  string `json:"display_name"`
	Description  string `json:"description"`
	ValueType    string `json:"value_type"`
	DefaultValue string `json:"default_value"`
	IsSecret     bool   `json:"is_secret"`
}

type UpdateSettingsRequest struct {
	Settings map[string]string `json:"settings" binding:"required"`
}
