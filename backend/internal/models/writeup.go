package models

type WriteupResponse struct {
	ID              int    `json:"id"`
	CompetitionID   int    `json:"competition_id"`
	ChallengeID     int    `json:"challenge_id"`
	ChallengeName   string `json:"challenge_name"`
	TeamID          int    `json:"team_id"`
	TeamName        string `json:"team_name"`
	UserID          int    `json:"user_id"`
	Username        string `json:"username"`
	Content         string `json:"content"`
	FileID          int    `json:"file_id,omitempty"`
	Status          string `json:"status"`
	ReviewerComment string `json:"reviewer_comment,omitempty"`
	ReviewedBy      int    `json:"reviewed_by,omitempty"`
	SubmittedAt     string `json:"submitted_at"`
}

type CreateWriteupRequest struct {
	ChallengeID int    `json:"challenge_id" binding:"required"`
	Content     string `json:"content"`
	FileID      int    `json:"file_id"`
}

type ReviewWriteupRequest struct {
	Status  string `json:"status" binding:"required,oneof=approved rejected"`
	Comment string `json:"comment"`
}

type WriteupListQuery struct {
	Page          int    `form:"page,default=1"`
	PageSize      int    `form:"page_size,default=20"`
	CompetitionID int    `form:"competition_id"`
	ChallengeID   int    `form:"challenge_id"`
	TeamID        int    `form:"team_id"`
	Status        string `form:"status"`
}
