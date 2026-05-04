package models

type FileResponse struct {
	ID           int    `json:"id"`
	Name         string `json:"name"`
	Path         string `json:"path"`
	Size         int64  `json:"size"`
	MimeType     string `json:"mime_type"`
	UploaderID   int    `json:"uploader_id"`
	UploaderName string `json:"uploader_name"`
	URL          string `json:"url"`
	CreatedAt    string `json:"created_at"`
}

type FileListQuery struct {
	Page     int `form:"page,default=1"`
	PageSize int `form:"page_size,default=20"`
}
