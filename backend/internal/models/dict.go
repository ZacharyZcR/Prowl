package models

type DictResponse struct {
	ID        int    `json:"id"`
	GroupName string `json:"group_name"`
	Key       string `json:"key"`
	Label     string `json:"label"`
	Value     string `json:"value"`
	SortOrder int    `json:"sort_order"`
	Enabled   bool   `json:"enabled"`
	CreatedAt string `json:"created_at"`
}

type CreateDictRequest struct {
	GroupName string `json:"group_name" binding:"required,max=50"`
	Key       string `json:"key" binding:"required,max=50"`
	Label     string `json:"label" binding:"required,max=100"`
	Value     string `json:"value"`
	SortOrder int    `json:"sort_order"`
	Enabled   *bool  `json:"enabled"`
}

type UpdateDictRequest struct {
	GroupName *string `json:"group_name" binding:"omitempty,max=50"`
	Key       *string `json:"key" binding:"omitempty,max=50"`
	Label     *string `json:"label" binding:"omitempty,max=100"`
	Value     *string `json:"value"`
	SortOrder *int    `json:"sort_order"`
	Enabled   *bool   `json:"enabled"`
}
