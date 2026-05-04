package models

type LoginLogResponse struct {
	ID            int    `json:"id"`
	UserID        int    `json:"user_id"`
	Username      string `json:"username"`
	IP            string `json:"ip"`
	UserAgent     string `json:"user_agent"`
	Success       bool   `json:"success"`
	FailureReason string `json:"failure_reason"`
	Location      string `json:"location"`
	CreatedAt     string `json:"created_at"`
}

type LoginLogListQuery struct {
	Page     int    `form:"page,default=1"`
	PageSize int    `form:"page_size,default=20"`
	Username string `form:"username"`
	IP       string `form:"ip"`
	Success  string `form:"success"`
}
