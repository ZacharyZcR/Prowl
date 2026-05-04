package models

type WebhookResponse struct {
	ID              int               `json:"id"`
	Name            string            `json:"name"`
	URL             string            `json:"url"`
	HasSecret       bool              `json:"has_secret"`
	Events          []string          `json:"events"`
	Headers         map[string]string `json:"headers"`
	Enabled         bool              `json:"enabled"`
	LastTriggeredAt string            `json:"last_triggered_at,omitempty"`
	LastStatusCode  int               `json:"last_status_code"`
	FailureCount    int               `json:"failure_count"`
	CreatedAt       string            `json:"created_at"`
}

type CreateWebhookRequest struct {
	Name    string            `json:"name" binding:"required,max=100"`
	URL     string            `json:"url" binding:"required,url"`
	Secret  string            `json:"secret"`
	Events  []string          `json:"events" binding:"required,min=1"`
	Headers map[string]string `json:"headers"`
}

type UpdateWebhookRequest struct {
	Name    *string            `json:"name" binding:"omitempty,max=100"`
	URL     *string            `json:"url" binding:"omitempty,url"`
	Secret  *string            `json:"secret"`
	Events  *[]string          `json:"events"`
	Headers *map[string]string `json:"headers"`
}

type TestResult struct {
	StatusCode   int    `json:"status_code"`
	ResponseBody string `json:"response_body"`
	Duration     string `json:"duration"`
}
