package models

type ScenarioResponse struct {
	ID                int                    `json:"id"`
	Name              string                 `json:"name"`
	Description       string                 `json:"description"`
	Topology          string                 `json:"topology"`
	DockerCompose     string                 `json:"docker_compose"`
	NetworkConfig     map[string]interface{} `json:"network_config"`
	Difficulty        string                 `json:"difficulty"`
	EstimatedDuration int                    `json:"estimated_duration"`
	Tags              []string               `json:"tags"`
	CreatedBy         int                    `json:"created_by"`
	CreatorName       string                 `json:"creator_name"`
	CreatedAt         string                 `json:"created_at"`
	UpdatedAt         string                 `json:"updated_at"`
}

type CreateScenarioRequest struct {
	Name              string                 `json:"name" binding:"required,min=1,max=200"`
	Description       string                 `json:"description"`
	Topology          string                 `json:"topology"`
	DockerCompose     string                 `json:"docker_compose"`
	NetworkConfig     map[string]interface{} `json:"network_config"`
	Difficulty        string                 `json:"difficulty"`
	EstimatedDuration int                    `json:"estimated_duration"`
	Tags              []string               `json:"tags"`
}

type UpdateScenarioRequest struct {
	Name              *string                `json:"name" binding:"omitempty,min=1,max=200"`
	Description       *string                `json:"description"`
	Topology          *string                `json:"topology"`
	DockerCompose     *string                `json:"docker_compose"`
	NetworkConfig     map[string]interface{} `json:"network_config"`
	Difficulty        *string                `json:"difficulty"`
	EstimatedDuration *int                   `json:"estimated_duration"`
	Tags              []string               `json:"tags"`
}

type ScenarioListQuery struct {
	Page     int    `form:"page,default=1"`
	PageSize int    `form:"page_size,default=20"`
	Search   string `form:"search"`
}

type ObjectiveResponse struct {
	ID              int    `json:"id"`
	CompetitionID   int    `json:"competition_id"`
	ScenarioID      int    `json:"scenario_id"`
	Title           string `json:"title"`
	TargetURL       string `json:"target_url"`
	Description     string `json:"description"`
	TeamRole        string `json:"team_role"`
	Points          int    `json:"points"`
	OrderNum        int    `json:"order_num"`
	Status          string `json:"status"`
	AssignedTeamID  int    `json:"assigned_team_id"`
	AssignedTeam    string `json:"assigned_team,omitempty"`
	ReportCount     int    `json:"report_count"`
	CompletedByTeam int    `json:"completed_by_team"`
	CompletedByUser int    `json:"completed_by_user"`
	CompletedAt     string `json:"completed_at,omitempty"`
	Evidence        string `json:"evidence"`
	JudgeComment    string `json:"judge_comment"`
	JudgedBy        int    `json:"judged_by"`
	CreatedAt       string `json:"created_at"`
}

type CreateObjectiveRequest struct {
	Title          string `json:"title" binding:"required,min=1,max=200"`
	TargetURL      string `json:"target_url"`
	Description    string `json:"description"`
	TeamRole       string `json:"team_role" binding:"required,oneof=red blue all"`
	Points         int    `json:"points" binding:"required,min=1"`
	OrderNum       int    `json:"order_num"`
	ScenarioID     int    `json:"scenario_id"`
	AssignedTeamID int    `json:"assigned_team_id"`
}

type BatchCreateObjectivesRequest struct {
	Objectives []CreateObjectiveRequest `json:"objectives" binding:"required,min=1,dive"`
}

type AssignObjectiveRequest struct {
	TeamID int `json:"team_id" binding:"required"`
}

type AutoAssignObjectivesRequest struct {
	TeamRole string `json:"team_role" binding:"required,oneof=red blue"`
	Strategy string `json:"strategy" binding:"required,oneof=random round_robin duplicate"`
}

type CompleteObjectiveRequest struct {
	TeamID   int    `json:"team_id" binding:"required"`
	UserID   int    `json:"user_id"`
	Evidence string `json:"evidence"`
}

type JudgeObjectiveRequest struct {
	Status  string `json:"status" binding:"required,oneof=completed failed"`
	Comment string `json:"comment"`
	Points  *int   `json:"points"`
}

type JudgeScoreRequest struct {
	TeamID      int    `json:"team_id" binding:"required"`
	Points      int    `json:"points" binding:"required"`
	Detail      string `json:"detail"`
	ChallengeID int    `json:"challenge_id"`
}
