package models

type AnnouncementResponse struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Content     string `json:"content"`
	Priority    string `json:"priority"`
	Published   bool   `json:"published"`
	PublishedAt string `json:"published_at,omitempty"`
	ExpiresAt   string `json:"expires_at,omitempty"`
	CreatedBy   int    `json:"created_by"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

type CreateAnnouncementRequest struct {
	Title     string  `json:"title" binding:"required,max=200"`
	Content   string  `json:"content"`
	Priority  string  `json:"priority" binding:"omitempty,oneof=info warning critical"`
	ExpiresAt *string `json:"expires_at"`
}

type UpdateAnnouncementRequest struct {
	Title     *string `json:"title" binding:"omitempty,max=200"`
	Content   *string `json:"content"`
	Priority  *string `json:"priority" binding:"omitempty,oneof=info warning critical"`
	ExpiresAt *string `json:"expires_at"`
}
