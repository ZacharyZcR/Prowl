package services

import (
	"context"
	"math"
	"time"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/attackreport"
	"github.com/ZacharyZcR/STC/backend/ent/defensereport"
	"github.com/ZacharyZcR/STC/backend/ent/exercisephase"
	"github.com/ZacharyZcR/STC/backend/ent/scorerecord"
	"github.com/ZacharyZcR/STC/backend/ent/teamregistration"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type RedBlueService struct {
	client *ent.Client
}

func NewRedBlueService(client *ent.Client) *RedBlueService {
	return &RedBlueService{client: client}
}

func (s *RedBlueService) CreateAttackReport(ctx context.Context, compID, teamID, userID int, req *models.CreateAttackReportRequest) (*ent.AttackReport, error) {
	builder := s.client.AttackReport.Create().
		SetCompetitionID(compID).SetTeamID(teamID).SetUserID(userID).
		SetTitle(req.Title).SetContent(req.Content).
		SetSeverity(attackreport.Severity(req.Severity)).
		SetVulnType(req.VulnType).SetTarget(req.Target).SetImpact(req.Impact).
		SetAttCkTactic(req.AttCkTactic).SetAttCkTechnique(req.AttCkTechnique).
		SetPhaseID(req.PhaseID).SetObjectiveID(req.ObjectiveID)
	if req.AttCkTechniques != nil {
		builder = builder.SetAttCkTechniques(req.AttCkTechniques)
	}
	if req.AttachmentIDs != nil {
		builder = builder.SetAttachmentIds(req.AttachmentIDs)
	}
	r, err := builder.Save(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to create attack report: " + err.Error())
	}
	return r, nil
}

func (s *RedBlueService) CreateDefenseReport(ctx context.Context, compID, teamID, userID int, req *models.CreateDefenseReportRequest) (*ent.DefenseReport, error) {
	builder := s.client.DefenseReport.Create().
		SetCompetitionID(compID).SetTeamID(teamID).SetUserID(userID).
		SetTitle(req.Title).SetContent(req.Content).
		SetActionType(defensereport.ActionType(req.ActionType)).
		SetThreatDescription(req.ThreatDescription).SetMitigation(req.Mitigation).
		SetRelatedAttackID(req.RelatedAttackID).
		SetPhaseID(req.PhaseID).SetObjectiveID(req.ObjectiveID)
	if req.DetectedTechniques != nil {
		builder = builder.SetDetectedTechniques(req.DetectedTechniques)
	}
	if req.AttachmentIDs != nil {
		builder = builder.SetAttachmentIds(req.AttachmentIDs)
	}
	r, err := builder.Save(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to create defense report: " + err.Error())
	}
	return r, nil
}

func (s *RedBlueService) ListAttackReports(ctx context.Context, compID int, q *models.ReportListQuery) (*models.PaginatedResponse, error) {
	query := s.client.AttackReport.Query().
		Where(attackreport.CompetitionID(compID)).
		WithTeam().WithUser()
	if q.Status != "" {
		query = query.Where(attackreport.StatusEQ(attackreport.Status(q.Status)))
	}
	if q.TeamID > 0 {
		query = query.Where(attackreport.TeamID(q.TeamID))
	}
	if q.Page < 1 { q.Page = 1 }
	if q.PageSize < 1 || q.PageSize > 100 { q.PageSize = 20 }

	total, _ := query.Count(ctx)
	reports, err := query.Limit(q.PageSize).Offset((q.Page-1)*q.PageSize).
		Order(ent.Desc(attackreport.FieldSubmittedAt)).All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list attack reports: " + err.Error())
	}

	items := make([]models.AttackReportResponse, 0, len(reports))
	for _, r := range reports {
		items = append(items, buildAttackReportResponse(r))
	}
	return &models.PaginatedResponse{
		Items: items, Total: total, Page: q.Page, PageSize: q.PageSize,
		TotalPages: int(math.Ceil(float64(total) / float64(q.PageSize))),
	}, nil
}

func (s *RedBlueService) ListDefenseReports(ctx context.Context, compID int, q *models.ReportListQuery) (*models.PaginatedResponse, error) {
	query := s.client.DefenseReport.Query().
		Where(defensereport.CompetitionID(compID)).
		WithTeam().WithUser()
	if q.Status != "" {
		query = query.Where(defensereport.StatusEQ(defensereport.Status(q.Status)))
	}
	if q.TeamID > 0 {
		query = query.Where(defensereport.TeamID(q.TeamID))
	}
	if q.Page < 1 { q.Page = 1 }
	if q.PageSize < 1 || q.PageSize > 100 { q.PageSize = 20 }

	total, _ := query.Count(ctx)
	reports, err := query.Limit(q.PageSize).Offset((q.Page-1)*q.PageSize).
		Order(ent.Desc(defensereport.FieldSubmittedAt)).All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list defense reports: " + err.Error())
	}

	items := make([]models.DefenseReportResponse, 0, len(reports))
	for _, r := range reports {
		items = append(items, buildDefenseReportResponse(r))
	}
	return &models.PaginatedResponse{
		Items: items, Total: total, Page: q.Page, PageSize: q.PageSize,
		TotalPages: int(math.Ceil(float64(total) / float64(q.PageSize))),
	}, nil
}

func (s *RedBlueService) JudgeAttackReport(ctx context.Context, reportID int, req *models.JudgeReportRequest, judgeID int) error {
	now := time.Now()
	r, err := s.client.AttackReport.UpdateOneID(reportID).
		SetStatus(attackreport.Status(req.Status)).
		SetScore(req.Score).SetJudgeComment(req.Comment).SetJudgedBy(judgeID).
		SetReviewedAt(now).Save(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to judge report: " + err.Error())
	}
	if req.Status == "accepted" && req.Score > 0 {
		_, _ = s.client.ScoreRecord.Create().
			SetCompetitionID(r.CompetitionID).SetTeamID(r.TeamID).
			SetScoreType(scorerecord.ScoreTypeBonus).SetPoints(req.Score).
			SetDetail("attack report: " + r.Title).Save(ctx)
	}
	return nil
}

func (s *RedBlueService) JudgeDefenseReport(ctx context.Context, reportID int, req *models.JudgeReportRequest, judgeID int) error {
	now := time.Now()
	r, err := s.client.DefenseReport.UpdateOneID(reportID).
		SetStatus(defensereport.Status(req.Status)).
		SetScore(req.Score).SetJudgeComment(req.Comment).SetJudgedBy(judgeID).
		SetReviewedAt(now).Save(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to judge report: " + err.Error())
	}
	if req.Status == "accepted" && req.Score > 0 {
		_, _ = s.client.ScoreRecord.Create().
			SetCompetitionID(r.CompetitionID).SetTeamID(r.TeamID).
			SetScoreType(scorerecord.ScoreTypeBonus).SetPoints(req.Score).
			SetDetail("defense report: " + r.Title).Save(ctx)
	}
	return nil
}

func (s *RedBlueService) ListPhases(ctx context.Context, compID int) ([]models.ExercisePhaseResponse, error) {
	phases, err := s.client.ExercisePhase.Query().
		Where(exercisephase.CompetitionID(compID)).
		Order(ent.Asc(exercisephase.FieldOrderNum)).All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list phases: " + err.Error())
	}
	items := make([]models.ExercisePhaseResponse, 0, len(phases))
	for _, p := range phases {
		item := models.ExercisePhaseResponse{
			ID: p.ID, CompetitionID: p.CompetitionID, Name: p.Name,
			Description: p.Description, OrderNum: p.OrderNum, Status: string(p.Status),
			DurationMinutes: p.DurationMinutes, CreatedAt: p.CreatedAt.Format("2006-01-02T15:04:05Z"),
		}
		if p.StartedAt != nil { item.StartedAt = p.StartedAt.Format("2006-01-02T15:04:05Z") }
		if p.EndedAt != nil { item.EndedAt = p.EndedAt.Format("2006-01-02T15:04:05Z") }
		items = append(items, item)
	}
	return items, nil
}

func (s *RedBlueService) CreatePhase(ctx context.Context, compID int, req *models.CreatePhaseRequest) (*ent.ExercisePhase, error) {
	p, err := s.client.ExercisePhase.Create().
		SetCompetitionID(compID).SetName(req.Name).SetDescription(req.Description).
		SetOrderNum(req.OrderNum).SetDurationMinutes(req.DurationMinutes).
		Save(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to create phase: " + err.Error())
	}
	return p, nil
}

func (s *RedBlueService) AdvancePhase(ctx context.Context, compID int) error {
	phases, err := s.client.ExercisePhase.Query().
		Where(exercisephase.CompetitionID(compID)).
		Order(ent.Asc(exercisephase.FieldOrderNum)).All(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to query phases: " + err.Error())
	}

	now := time.Now()
	for _, p := range phases {
		if p.Status == exercisephase.StatusActive {
			_, _ = s.client.ExercisePhase.UpdateOneID(p.ID).
				SetStatus(exercisephase.StatusCompleted).SetEndedAt(now).Save(ctx)
			continue
		}
		if p.Status == exercisephase.StatusPending {
			_, _ = s.client.ExercisePhase.UpdateOneID(p.ID).
				SetStatus(exercisephase.StatusActive).SetStartedAt(now).Save(ctx)
			return nil
		}
	}
	return nil
}

func buildAttackReportResponse(r *ent.AttackReport) models.AttackReportResponse {
	resp := models.AttackReportResponse{
		ID: r.ID, CompetitionID: r.CompetitionID, TeamID: r.TeamID, UserID: r.UserID,
		PhaseID: r.PhaseID, ObjectiveID: r.ObjectiveID, Title: r.Title, Content: r.Content,
		Severity: string(r.Severity), VulnType: r.VulnType, Target: r.Target, Impact: r.Impact,
		AttCkTactic: r.AttCkTactic, AttCkTechnique: r.AttCkTechnique, AttCkTechniques: r.AttCkTechniques,
		AttachmentIDs: r.AttachmentIds, Status: string(r.Status), Score: r.Score,
		JudgeComment: r.JudgeComment, JudgedBy: r.JudgedBy,
		SubmittedAt: r.SubmittedAt.Format("2006-01-02T15:04:05Z"),
	}
	if r.Edges.Team != nil { resp.TeamName = r.Edges.Team.Name }
	if r.Edges.User != nil { resp.Username = r.Edges.User.Username }
	if r.ReviewedAt != nil { resp.ReviewedAt = r.ReviewedAt.Format("2006-01-02T15:04:05Z") }
	return resp
}

func buildDefenseReportResponse(r *ent.DefenseReport) models.DefenseReportResponse {
	resp := models.DefenseReportResponse{
		ID: r.ID, CompetitionID: r.CompetitionID, TeamID: r.TeamID, UserID: r.UserID,
		PhaseID: r.PhaseID, ObjectiveID: r.ObjectiveID, Title: r.Title, Content: r.Content,
		ActionType: string(r.ActionType), ThreatDescription: r.ThreatDescription, Mitigation: r.Mitigation,
		DetectedTechniques: r.DetectedTechniques, RelatedAttackID: r.RelatedAttackID,
		AttachmentIDs: r.AttachmentIds, Status: string(r.Status), Score: r.Score,
		JudgeComment: r.JudgeComment, JudgedBy: r.JudgedBy,
		SubmittedAt: r.SubmittedAt.Format("2006-01-02T15:04:05Z"),
	}
	if r.Edges.Team != nil { resp.TeamName = r.Edges.Team.Name }
	if r.Edges.User != nil { resp.Username = r.Edges.User.Username }
	if r.ReviewedAt != nil { resp.ReviewedAt = r.ReviewedAt.Format("2006-01-02T15:04:05Z") }
	return resp
}

func (s *RedBlueService) GenerateSummary(ctx context.Context, compID int) (*models.ExerciseSummaryResponse, error) {
	attacks, err := s.client.AttackReport.Query().Where(attackreport.CompetitionID(compID)).All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to query attack reports: " + err.Error())
	}
	defenses, err := s.client.DefenseReport.Query().Where(defensereport.CompetitionID(compID)).All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to query defense reports: " + err.Error())
	}

	var accepted, rejected int
	techAttackCount := make(map[string]int)
	for _, a := range attacks {
		switch a.Status {
		case attackreport.StatusAccepted:
			accepted++
		case attackreport.StatusRejected:
			rejected++
		}
		for _, t := range a.AttCkTechniques {
			techAttackCount[t]++
		}
		if a.AttCkTechnique != "" {
			techAttackCount[a.AttCkTechnique]++
		}
	}

	techDetectCount := make(map[string]int)
	var totalResponseMinutes float64
	var responseCount int
	for _, d := range defenses {
		for _, t := range d.DetectedTechniques {
			techDetectCount[t]++
		}
		if d.RelatedAttackID > 0 && d.Status == defensereport.StatusAccepted {
			for _, a := range attacks {
				if a.ID == d.RelatedAttackID {
					diff := d.SubmittedAt.Sub(a.SubmittedAt).Minutes()
					if diff > 0 {
						totalResponseMinutes += diff
						responseCount++
					}
					break
				}
			}
		}
	}

	successRate := 0.0
	if len(attacks) > 0 {
		successRate = float64(accepted) / float64(len(attacks))
	}
	avgResponse := 0.0
	if responseCount > 0 {
		avgResponse = totalResponseMinutes / float64(responseCount)
	}

	regs, _ := s.client.TeamRegistration.Query().
		Where(teamregistration.CompetitionID(compID), teamregistration.StatusEQ(teamregistration.StatusApproved)).
		WithTeam().All(ctx)

	teamScores := make([]models.TeamExerciseScore, 0, len(regs))
	for _, reg := range regs {
		if reg.Edges.Team == nil {
			continue
		}
		scores, _ := s.client.ScoreRecord.Query().
			Where(scorerecord.CompetitionID(compID), scorerecord.TeamID(reg.TeamID)).
			All(ctx)
		var atkScore, defScore, total int
		for _, sr := range scores {
			total += sr.Points
			if len(sr.Detail) > 6 && sr.Detail[:6] == "attack" {
				atkScore += sr.Points
			} else {
				defScore += sr.Points
			}
		}

		var reportCount int
		for _, a := range attacks {
			if a.TeamID == reg.TeamID {
				reportCount++
			}
		}
		for _, d := range defenses {
			if d.TeamID == reg.TeamID {
				reportCount++
			}
		}

		teamScores = append(teamScores, models.TeamExerciseScore{
			TeamID: reg.TeamID, TeamName: reg.Edges.Team.Name, TeamRole: string(reg.TeamRole),
			AttackScore: atkScore, DefenseScore: defScore, TotalScore: total, ReportCount: reportCount,
		})
	}

	phases, _ := s.client.ExercisePhase.Query().
		Where(exercisephase.CompetitionID(compID)).
		Order(ent.Asc(exercisephase.FieldOrderNum)).All(ctx)

	phaseStats := make([]models.PhaseStatEntry, 0, len(phases))
	for _, p := range phases {
		var ac, dc int
		for _, a := range attacks {
			if a.PhaseID == p.ID {
				ac++
			}
		}
		for _, d := range defenses {
			if d.PhaseID == p.ID {
				dc++
			}
		}
		phaseStats = append(phaseStats, models.PhaseStatEntry{
			PhaseID: p.ID, PhaseName: p.Name, AttackCount: ac, DefenseCount: dc,
		})
	}

	allTechs := make(map[string]bool)
	for t := range techAttackCount {
		allTechs[t] = true
	}
	for t := range techDetectCount {
		allTechs[t] = true
	}
	heatmap := make([]models.TechniqueHeatEntry, 0, len(allTechs))
	for t := range allTechs {
		ac := techAttackCount[t]
		dc := techDetectCount[t]
		rate := 0.0
		if ac > 0 {
			rate = float64(dc) / float64(ac)
		}
		heatmap = append(heatmap, models.TechniqueHeatEntry{
			Technique: t, AttackCount: ac, DetectCount: dc, DetectRate: math.Round(rate*1000) / 1000,
		})
	}

	return &models.ExerciseSummaryResponse{
		CompetitionID:       compID,
		TotalAttackReports:  len(attacks),
		AcceptedAttacks:     accepted,
		RejectedAttacks:     rejected,
		AttackSuccessRate:   math.Round(successRate*1000) / 1000,
		TotalDefenseReports: len(defenses),
		AcceptedDefenses:    accepted,
		AvgResponseMinutes:  math.Round(avgResponse*10) / 10,
		TeamScores:          teamScores,
		PhaseStats:          phaseStats,
		TechniqueHeatmap:    heatmap,
		GeneratedAt:         time.Now().Format("2006-01-02T15:04:05Z"),
	}, nil
}
