package models

type ProjectResponse struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Status      string `json:"status"`
	OwnerID     int    `json:"owner_id"`
	OwnerName   string `json:"owner_name"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

type CreateProjectRequest struct {
	Name        string `json:"name" binding:"required,min=1,max=128"`
	Description string `json:"description"`
	Status      string `json:"status" binding:"omitempty,oneof=active archived draft"`
}

type UpdateProjectRequest struct {
	Name        *string `json:"name" binding:"omitempty,min=1,max=128"`
	Description *string `json:"description"`
	Status      *string `json:"status" binding:"omitempty,oneof=active archived draft"`
}

type ProjectListQuery struct {
	Page     int    `form:"page,default=1"`
	PageSize int    `form:"page_size,default=20"`
	Search   string `form:"search"`
	Status   string `form:"status"`
}
