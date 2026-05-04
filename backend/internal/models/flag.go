package models

type SubmitFlagRequest struct {
	ChallengeID int    `json:"challenge_id" binding:"required"`
	Flag        string `json:"flag" binding:"required"`
}

type SubmitFlagResponse struct {
	Correct    bool   `json:"correct"`
	Points     int    `json:"points"`
	FirstBlood bool   `json:"first_blood"`
	Message    string `json:"message"`
}

type FlagSubmissionResponse struct {
	ID            int    `json:"id"`
	CompetitionID int    `json:"competition_id"`
	ChallengeID   int    `json:"challenge_id"`
	ChallengeName string `json:"challenge_name"`
	TeamID        int    `json:"team_id"`
	TeamName      string `json:"team_name"`
	UserID        int    `json:"user_id"`
	Username      string `json:"username"`
	SubmittedFlag string `json:"submitted_flag"`
	IsCorrect     bool   `json:"is_correct"`
	PointsAwarded int    `json:"points_awarded"`
	IsFirstBlood  bool   `json:"is_first_blood"`
	IP            string `json:"ip"`
	SubmittedAt   string `json:"submitted_at"`
}

type SubmissionListQuery struct {
	Page        int    `form:"page,default=1"`
	PageSize    int    `form:"page_size,default=20"`
	TeamID      int    `form:"team_id"`
	ChallengeID int    `form:"challenge_id"`
	IsCorrect   *bool  `form:"is_correct"`
}
