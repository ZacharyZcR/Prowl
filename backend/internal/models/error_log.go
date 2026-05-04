package models

type ErrorLogResponse struct {
	ID              int                    `json:"id"`
	Source          string                 `json:"source"`
	ErrType         string                 `json:"err_type"`
	Message         string                 `json:"message"`
	Stack           string                 `json:"stack"`
	URL             string                 `json:"url"`
	Method          string                 `json:"method"`
	StatusCode      int                    `json:"status_code"`
	Params          map[string]interface{} `json:"params,omitempty"`
	UserAgent       string                 `json:"user_agent"`
	RequestID       string                 `json:"request_id"`
	UserID          int                    `json:"user_id"`
	Fingerprint     string                 `json:"fingerprint"`
	OccurrenceCount int                    `json:"occurrence_count"`
	FirstSeenAt     string                 `json:"first_seen_at"`
	LastSeenAt      string                 `json:"last_seen_at"`
	Resolved        bool                   `json:"resolved"`
	ResolvedBy      int                    `json:"resolved_by,omitempty"`
	ResolvedAt      string                 `json:"resolved_at,omitempty"`
	Severity        string                 `json:"severity"`
	CreatedAt       string                 `json:"created_at"`
}

type ErrorLogQuery struct {
	Page     int    `form:"page,default=1"`
	PageSize int    `form:"page_size,default=20"`
	Source   string `form:"source"`
	ErrType  string `form:"err_type"`
	Severity string `form:"severity"`
	Resolved *bool  `form:"resolved"`
	Search   string `form:"search"`
}

type BulkResolveRequest struct {
	IDs []int `json:"ids" binding:"required"`
}

type ErrorLogStats struct {
	Total      int            `json:"total"`
	Unresolved int            `json:"unresolved"`
	BySeverity map[string]int `json:"by_severity"`
	BySource   map[string]int `json:"by_source"`
	ByType     map[string]int `json:"by_type"`
}

type ReportErrorRequest struct {
	Type    string `json:"type" binding:"required"`
	Message string `json:"message" binding:"required"`
	Stack   string `json:"stack"`
	URL     string `json:"url"`
}
