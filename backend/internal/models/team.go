package models

type TeamResponse struct {
	ID          int                  `json:"id"`
	Name        string               `json:"name"`
	Description string               `json:"description"`
	AvatarURL   string               `json:"avatar_url"`
	InviteCode  string               `json:"invite_code,omitempty"`
	CaptainID   int                  `json:"captain_id"`
	CaptainName string               `json:"captain_name"`
	IsActive    bool                 `json:"is_active"`
	Members     []TeamMemberResponse `json:"members,omitempty"`
	CreatedAt   string               `json:"created_at"`
	UpdatedAt   string               `json:"updated_at"`
}

type TeamMemberResponse struct {
	ID       int    `json:"id"`
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	JoinedAt string `json:"joined_at"`
}

type CreateTeamRequest struct {
	Name        string `json:"name" binding:"required,min=1,max=100"`
	Description string `json:"description"`
}

type UpdateTeamRequest struct {
	Name        *string `json:"name" binding:"omitempty,min=1,max=100"`
	Description *string `json:"description"`
	AvatarURL   *string `json:"avatar_url"`
}

type JoinTeamRequest struct {
	InviteCode string `json:"invite_code" binding:"required"`
}

type TeamListQuery struct {
	Page     int    `form:"page,default=1"`
	PageSize int    `form:"page_size,default=20"`
	Search   string `form:"search"`
}

type RegisterCompetitionRequest struct {
	Password string `json:"password"`
}

type TeamCompetitionEntry struct {
	CompetitionID int    `json:"competition_id"`
	Title         string `json:"title"`
	Mode          string `json:"mode"`
	Status        string `json:"status"`
	TeamRole      string `json:"team_role"`
	RegStatus     string `json:"reg_status"`
	StartTime     string `json:"start_time,omitempty"`
	EndTime       string `json:"end_time,omitempty"`
	RegisteredAt  string `json:"registered_at"`
}
