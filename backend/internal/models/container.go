package models

type InstanceResponse struct {
	ID            int               `json:"id"`
	ChallengeID   int               `json:"challenge_id"`
	ChallengeName string            `json:"challenge_name"`
	CompetitionID int               `json:"competition_id"`
	TeamID        int               `json:"team_id"`
	TeamName      string            `json:"team_name"`
	ContainerID   string            `json:"container_id"`
	StackID       string            `json:"stack_id,omitempty"`
	Containers    map[string]string `json:"containers,omitempty"`
	Networks      map[string]string `json:"networks,omitempty"`
	Status        string            `json:"status"`
	AccessURL     string            `json:"access_url"`
	Ports         map[string]string `json:"ports"`
	SSHUser       string            `json:"ssh_user,omitempty"`
	SSHPassword   string            `json:"ssh_password,omitempty"`
	SSHAddress    string            `json:"ssh_address,omitempty"`
	ExpiresAt     string            `json:"expires_at"`
	StartedAt     string            `json:"started_at,omitempty"`
	StoppedAt     string            `json:"stopped_at,omitempty"`
	CreatedAt     string            `json:"created_at"`
}

type InstanceStatsResponse struct {
	TotalInstances   int `json:"total_instances"`
	RunningInstances int `json:"running_instances"`
	PendingInstances int `json:"pending_instances"`
	StoppedInstances int `json:"stopped_instances"`
	ErrorInstances   int `json:"error_instances"`
}

type InstanceListQuery struct {
	Page          int    `form:"page,default=1"`
	PageSize      int    `form:"page_size,default=20"`
	CompetitionID int    `form:"competition_id"`
	TeamID        int    `form:"team_id"`
	Status        string `form:"status"`
}
