package models

type PermissionResponse struct {
	ID          int    `json:"id"`
	Code        string `json:"code"`
	Name        string `json:"name"`
	Resource    string `json:"resource"`
	Action      string `json:"action"`
	Scope       string `json:"scope"`
	Description string `json:"description"`
	Category    string `json:"category"`
}

type PermissionCategoryResponse struct {
	Category    string               `json:"category"`
	Permissions []PermissionResponse `json:"permissions"`
}
