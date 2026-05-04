package models

type AWDConfigResponse struct {
	RoundInterval int             `json:"round_interval"`
	AttackScore   int             `json:"attack_score"`
	DefenseScore  int             `json:"defense_score"`
	CheckScore    int             `json:"check_score"`
	Checkers      []CheckerConfig `json:"checkers"`
}

type CheckerConfig struct {
	ChallengeID int    `json:"challenge_id"`
	Type        string `json:"type"`
	URLPath     string `json:"url_path,omitempty"`
	Port        int    `json:"port,omitempty"`
}

type UpdateAWDConfigRequest struct {
	RoundInterval *int             `json:"round_interval"`
	AttackScore   *int             `json:"attack_score"`
	DefenseScore  *int             `json:"defense_score"`
	CheckScore    *int             `json:"check_score"`
	Checkers      []CheckerConfig  `json:"checkers"`
}

type CheckerMatrixEntry struct {
	TeamID        int    `json:"team_id"`
	TeamName      string `json:"team_name"`
	ChallengeID   int    `json:"challenge_id"`
	ChallengeName string `json:"challenge_name"`
	Status        string `json:"status"`
}

type CheckerMatrixResponse struct {
	RoundNumber int                  `json:"round_number"`
	Entries     []CheckerMatrixEntry `json:"entries"`
}
