package models

type CompetitionResponse struct {
	ID                    int                    `json:"id"`
	Title                 string                 `json:"title"`
	Description           string                 `json:"description"`
	Mode                  string                 `json:"mode"`
	Status                string                 `json:"status"`
	StartTime             *string                `json:"start_time"`
	EndTime               *string                `json:"end_time"`
	RegistrationStart     *string                `json:"registration_start"`
	RegistrationEnd       *string                `json:"registration_end"`
	MaxTeams              int                    `json:"max_teams"`
	MaxTeamSize           int                    `json:"max_team_size"`
	IsPublic              bool                   `json:"is_public"`
	ScoringConfig         map[string]interface{} `json:"scoring_config"`
	BannerURL             string                 `json:"banner_url"`
	Rules                 string                 `json:"rules"`
	ScoreboardFreezeAt    *string                `json:"scoreboard_freeze_at"`
	SubmitIntervalSeconds int                    `json:"submit_interval_seconds"`
	CreatedBy             int                    `json:"created_by"`
	CreatorName           string                 `json:"creator_name"`
	TeamCount             int                    `json:"team_count"`
	ChallengeCount        int                    `json:"challenge_count"`
	CreatedAt             string                 `json:"created_at"`
	UpdatedAt             string                 `json:"updated_at"`
}

type CompetitionPortalResponse struct {
	ID                 int     `json:"id"`
	Title              string  `json:"title"`
	Description        string  `json:"description"`
	Mode               string  `json:"mode"`
	Status             string  `json:"status"`
	StartTime          *string `json:"start_time"`
	EndTime            *string `json:"end_time"`
	RegistrationStart  *string `json:"registration_start"`
	RegistrationEnd    *string `json:"registration_end"`
	MaxTeams           int     `json:"max_teams"`
	MaxTeamSize        int     `json:"max_team_size"`
	IsPublic           bool    `json:"is_public"`
	BannerURL          string  `json:"banner_url"`
	Rules              string  `json:"rules"`
	TeamCount          int     `json:"team_count"`
	ChallengeCount     int     `json:"challenge_count"`
	IsRegistered       bool    `json:"is_registered"`
	RegistrationStatus string  `json:"registration_status"`
	TeamRole           string  `json:"team_role"`
}

type CreateCompetitionRequest struct {
	Title                 string                 `json:"title" binding:"required,min=1,max=200"`
	Description           string                 `json:"description"`
	Mode                  string                 `json:"mode" binding:"required,oneof=ctf_jeopardy awd red_blue"`
	StartTime             *string                `json:"start_time" binding:"required"`
	EndTime               *string                `json:"end_time" binding:"required"`
	RegistrationStart     *string                `json:"registration_start"`
	RegistrationEnd       *string                `json:"registration_end"`
	MaxTeams              int                    `json:"max_teams"`
	MaxTeamSize           int                    `json:"max_team_size"`
	IsPublic              bool                   `json:"is_public"`
	Password              string                 `json:"password"`
	ScoringConfig         map[string]interface{} `json:"scoring_config"`
	BannerURL             string                 `json:"banner_url"`
	Rules                 string                 `json:"rules"`
	ScoreboardFreezeAt    *string                `json:"scoreboard_freeze_at"`
	SubmitIntervalSeconds *int                   `json:"submit_interval_seconds"`
}

type UpdateCompetitionRequest struct {
	Title                 *string                `json:"title" binding:"omitempty,min=1,max=200"`
	Description           *string                `json:"description"`
	StartTime             *string                `json:"start_time"`
	EndTime               *string                `json:"end_time"`
	RegistrationStart     *string                `json:"registration_start"`
	RegistrationEnd       *string                `json:"registration_end"`
	MaxTeams              *int                   `json:"max_teams"`
	MaxTeamSize           *int                   `json:"max_team_size"`
	IsPublic              *bool                  `json:"is_public"`
	Password              *string                `json:"password"`
	ScoringConfig         map[string]interface{} `json:"scoring_config"`
	BannerURL             *string                `json:"banner_url"`
	Rules                 *string                `json:"rules"`
	ScoreboardFreezeAt    *string                `json:"scoreboard_freeze_at"`
	SubmitIntervalSeconds *int                   `json:"submit_interval_seconds"`
}

type CompetitionStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=draft registration running paused ended archived"`
}

type CompetitionListQuery struct {
	Page     int    `form:"page,default=1"`
	PageSize int    `form:"page_size,default=20"`
	Search   string `form:"search"`
	Mode     string `form:"mode"`
	Status   string `form:"status"`
}

type AttachChallengeRequest struct {
	ChallengeID int  `json:"challenge_id" binding:"required"`
	OrderNum    int  `json:"order_num"`
	IsVisible   bool `json:"is_visible"`
}

type RegistrationReviewRequest struct {
	Status string `json:"status" binding:"required,oneof=approved rejected"`
}

type BatchAttachRequest struct {
	Challenges []AttachChallengeRequest `json:"challenges" binding:"required,min=1"`
}

type ReleaseChallengesRequest struct {
	ChallengeIDs []int `json:"challenge_ids" binding:"required,min=1"`
}

type CompetitionChallengeResponse struct {
	ID             int     `json:"id"`
	CompetitionID  int     `json:"competition_id"`
	ChallengeID    int     `json:"challenge_id"`
	ChallengeTitle string  `json:"challenge_title"`
	Category       string  `json:"category"`
	Difficulty     string  `json:"difficulty"`
	OrderNum       int     `json:"order_num"`
	IsVisible      bool    `json:"is_visible"`
	ReleasedAt     *string `json:"released_at"`
	ExtraScore     int     `json:"extra_score"`
	CreatedAt      string  `json:"created_at"`
}

type RegistrationResponse struct {
	ID            int    `json:"id"`
	TeamID        int    `json:"team_id"`
	TeamName      string `json:"team_name"`
	CompetitionID int    `json:"competition_id"`
	Status        string `json:"status"`
	TeamRole      string `json:"team_role"`
	RegisteredAt  string `json:"registered_at"`
	ReviewedAt    string `json:"reviewed_at,omitempty"`
}
