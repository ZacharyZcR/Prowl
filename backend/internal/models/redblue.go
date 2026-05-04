package models

type AttackReportResponse struct {
	ID               int      `json:"id"`
	CompetitionID    int      `json:"competition_id"`
	TeamID           int      `json:"team_id"`
	TeamName         string   `json:"team_name"`
	UserID           int      `json:"user_id"`
	Username         string   `json:"username"`
	PhaseID          int      `json:"phase_id"`
	ObjectiveID      int      `json:"objective_id"`
	Title            string   `json:"title"`
	Content          string   `json:"content"`
	Severity         string   `json:"severity"`
	VulnType         string   `json:"vuln_type"`
	Target           string   `json:"target"`
	Impact           string   `json:"impact"`
	AttCkTactic      string   `json:"att_ck_tactic"`
	AttCkTechnique   string   `json:"att_ck_technique"`
	AttCkTechniques  []string `json:"att_ck_techniques"`
	AttachmentIDs    []int    `json:"attachment_ids"`
	Status           string   `json:"status"`
	Score            int      `json:"score"`
	JudgeComment     string   `json:"judge_comment"`
	JudgedBy         int      `json:"judged_by"`
	SubmittedAt      string   `json:"submitted_at"`
	ReviewedAt       string   `json:"reviewed_at,omitempty"`
}

type CreateAttackReportRequest struct {
	Title           string   `json:"title" binding:"required,min=1,max=200"`
	Content         string   `json:"content"`
	Severity        string   `json:"severity" binding:"required,oneof=info low medium high critical"`
	VulnType        string   `json:"vuln_type"`
	Target          string   `json:"target"`
	Impact          string   `json:"impact"`
	AttCkTactic     string   `json:"att_ck_tactic"`
	AttCkTechnique  string   `json:"att_ck_technique"`
	AttCkTechniques []string `json:"att_ck_techniques"`
	PhaseID         int      `json:"phase_id"`
	ObjectiveID     int      `json:"objective_id"`
	AttachmentIDs   []int    `json:"attachment_ids"`
}

type DefenseReportResponse struct {
	ID                 int      `json:"id"`
	CompetitionID      int      `json:"competition_id"`
	TeamID             int      `json:"team_id"`
	TeamName           string   `json:"team_name"`
	UserID             int      `json:"user_id"`
	Username           string   `json:"username"`
	PhaseID            int      `json:"phase_id"`
	ObjectiveID        int      `json:"objective_id"`
	Title              string   `json:"title"`
	Content            string   `json:"content"`
	ActionType         string   `json:"action_type"`
	ThreatDescription  string   `json:"threat_description"`
	Mitigation         string   `json:"mitigation"`
	DetectedTechniques []string `json:"detected_techniques"`
	RelatedAttackID    int      `json:"related_attack_id"`
	AttachmentIDs      []int    `json:"attachment_ids"`
	Status             string   `json:"status"`
	Score              int      `json:"score"`
	JudgeComment       string   `json:"judge_comment"`
	JudgedBy           int      `json:"judged_by"`
	SubmittedAt        string   `json:"submitted_at"`
	ReviewedAt         string   `json:"reviewed_at,omitempty"`
}

type CreateDefenseReportRequest struct {
	Title              string   `json:"title" binding:"required,min=1,max=200"`
	Content            string   `json:"content"`
	ActionType         string   `json:"action_type" binding:"required,oneof=detection response hardening other"`
	ThreatDescription  string   `json:"threat_description"`
	Mitigation         string   `json:"mitigation"`
	DetectedTechniques []string `json:"detected_techniques"`
	RelatedAttackID    int      `json:"related_attack_id"`
	PhaseID            int      `json:"phase_id"`
	ObjectiveID        int      `json:"objective_id"`
	AttachmentIDs      []int    `json:"attachment_ids"`
}

type JudgeReportRequest struct {
	Status  string `json:"status" binding:"required,oneof=accepted rejected"`
	Score   int    `json:"score"`
	Comment string `json:"comment"`
}

type ReportListQuery struct {
	Page     int    `form:"page,default=1"`
	PageSize int    `form:"page_size,default=20"`
	Status   string `form:"status"`
	TeamID   int    `form:"team_id"`
}

type ExercisePhaseResponse struct {
	ID              int    `json:"id"`
	CompetitionID   int    `json:"competition_id"`
	Name            string `json:"name"`
	Description     string `json:"description"`
	OrderNum        int    `json:"order_num"`
	Status          string `json:"status"`
	DurationMinutes int    `json:"duration_minutes"`
	StartedAt       string `json:"started_at,omitempty"`
	EndedAt         string `json:"ended_at,omitempty"`
	CreatedAt       string `json:"created_at"`
}

type CreatePhaseRequest struct {
	Name            string `json:"name" binding:"required,min=1,max=100"`
	Description     string `json:"description"`
	OrderNum        int    `json:"order_num"`
	DurationMinutes int    `json:"duration_minutes"`
}

type RegistrationRequest struct {
	TeamRole string `json:"team_role" binding:"omitempty,oneof=red blue white participant"`
}

type ExerciseSummaryResponse struct {
	CompetitionID       int                  `json:"competition_id"`
	TotalAttackReports  int                  `json:"total_attack_reports"`
	AcceptedAttacks     int                  `json:"accepted_attacks"`
	RejectedAttacks     int                  `json:"rejected_attacks"`
	AttackSuccessRate   float64              `json:"attack_success_rate"`
	TotalDefenseReports int                  `json:"total_defense_reports"`
	AcceptedDefenses    int                  `json:"accepted_defenses"`
	AvgResponseMinutes  float64              `json:"avg_response_minutes"`
	TeamScores          []TeamExerciseScore  `json:"team_scores"`
	PhaseStats          []PhaseStatEntry     `json:"phase_stats"`
	TechniqueHeatmap    []TechniqueHeatEntry `json:"technique_heatmap"`
	GeneratedAt         string               `json:"generated_at"`
}

type TeamExerciseScore struct {
	TeamID       int     `json:"team_id"`
	TeamName     string  `json:"team_name"`
	TeamRole     string  `json:"team_role"`
	AttackScore  int     `json:"attack_score"`
	DefenseScore int     `json:"defense_score"`
	TotalScore   int     `json:"total_score"`
	ReportCount  int     `json:"report_count"`
}

type PhaseStatEntry struct {
	PhaseID       int    `json:"phase_id"`
	PhaseName     string `json:"phase_name"`
	AttackCount   int    `json:"attack_count"`
	DefenseCount  int    `json:"defense_count"`
	TotalScore    int    `json:"total_score"`
}

type TechniqueHeatEntry struct {
	Technique    string `json:"technique"`
	AttackCount  int    `json:"attack_count"`
	DetectCount  int    `json:"detect_count"`
	DetectRate   float64 `json:"detect_rate"`
}
