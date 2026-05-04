package models

type ActivityResponse struct {
	ID           int                    `json:"id"`
	Action       string                 `json:"action"`
	ResourceType string                 `json:"resource_type"`
	ResourceID   int                    `json:"resource_id"`
	UserID       int                    `json:"user_id"`
	Username     string                 `json:"username"`
	Detail       string                 `json:"detail"`
	Details      map[string]interface{} `json:"details,omitempty"`
	IP           string                 `json:"ip"`
	UserAgent    string                 `json:"user_agent"`
	Method       string                 `json:"method"`
	Path         string                 `json:"path"`
	StatusCode   int                    `json:"status_code"`
	CreatedAt    string                 `json:"created_at"`
}

type ActivityListQuery struct {
	Page         int    `form:"page,default=1"`
	PageSize     int    `form:"page_size,default=20"`
	ResourceType string `form:"resource_type"`
	UserID       int    `form:"user_id"`
	Action       string `form:"action"`
}
