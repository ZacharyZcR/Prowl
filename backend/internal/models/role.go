package models

type RoleResponse struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
	UserCount   int      `json:"user_count"`
	CreatedAt   string   `json:"created_at"`
}

type CreateRoleRequest struct {
	Name        string   `json:"name" binding:"required,min=2,max=32"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions" binding:"required"`
}

type UpdateRoleRequest struct {
	Name        *string   `json:"name" binding:"omitempty,min=2,max=32"`
	Description *string   `json:"description"`
	Permissions *[]string `json:"permissions"`
}
