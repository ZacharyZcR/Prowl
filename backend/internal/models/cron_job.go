package models

type CronJobResponse struct {
	ID         int     `json:"id"`
	Name       string  `json:"name"`
	CronExpr   string  `json:"cron_expr"`
	Handler    string  `json:"handler"`
	Enabled    bool    `json:"enabled"`
	LastRunAt  string  `json:"last_run_at,omitempty"`
	LastStatus *string `json:"last_status,omitempty"`
	LastError  *string `json:"last_error,omitempty"`
	NextRunAt  string  `json:"next_run_at,omitempty"`
	CreatedAt  string  `json:"created_at"`
	UpdatedAt  string  `json:"updated_at"`
}

type CreateCronJobRequest struct {
	Name     string `json:"name" binding:"required,max=100"`
	CronExpr string `json:"cron_expr" binding:"required,max=50"`
	Handler  string `json:"handler" binding:"required,max=100"`
	Enabled  *bool  `json:"enabled"`
}

type UpdateCronJobRequest struct {
	Name     *string `json:"name" binding:"omitempty,max=100"`
	CronExpr *string `json:"cron_expr" binding:"omitempty,max=50"`
	Handler  *string `json:"handler" binding:"omitempty,max=100"`
	Enabled  *bool   `json:"enabled"`
}
