package models

type ScoreboardResponse struct {
	CompetitionID int              `json:"competition_id"`
	Mode          string           `json:"mode"`
	IsFrozen      bool             `json:"is_frozen"`
	UpdatedAt     string           `json:"updated_at"`
	Teams         []TeamScoreEntry `json:"teams"`
}

type TeamScoreEntry struct {
	Rank           int                `json:"rank"`
	TeamID         int                `json:"team_id"`
	TeamName       string             `json:"team_name"`
	TeamRole       string             `json:"team_role,omitempty"`
	TotalScore     int                `json:"total_score"`
	SolveCount     int                `json:"solve_count"`
	LastSolveAt    string             `json:"last_solve_at,omitempty"`
	Challenges     []ChallengeSolve   `json:"challenges,omitempty"`
	AWDAttackScore int                `json:"awd_attack_score,omitempty"`
	AWDDefenseScore int               `json:"awd_defense_score,omitempty"`
	AWDCheckScore  int                `json:"awd_check_score,omitempty"`
}

type ChallengeSolve struct {
	ChallengeID int    `json:"challenge_id"`
	Points      int    `json:"points"`
	IsFirstBlood bool  `json:"is_first_blood"`
	SolvedAt    string `json:"solved_at"`
}
