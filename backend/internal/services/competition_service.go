package services

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/competition"
	"github.com/ZacharyZcR/STC/backend/ent/competitionchallenge"
	"github.com/ZacharyZcR/STC/backend/ent/objective"
	"github.com/ZacharyZcR/STC/backend/ent/teamregistration"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/tx"
)

type CompetitionService struct {
	client   *ent.Client
	activity *ActivityService
}

func NewCompetitionService(client *ent.Client, activity *ActivityService) *CompetitionService {
	return &CompetitionService{client: client, activity: activity}
}

func (s *CompetitionService) List(ctx context.Context, q *models.CompetitionListQuery) (*models.PaginatedResponse, error) {
	query := s.client.Competition.Query().WithCreator()

	if q.Search != "" {
		query = query.Where(competition.TitleContains(q.Search))
	}
	if q.Mode != "" {
		query = query.Where(competition.ModeEQ(competition.Mode(q.Mode)))
	}
	if q.Status != "" {
		query = query.Where(competition.StatusEQ(competition.Status(q.Status)))
	}

	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 || q.PageSize > 100 {
		q.PageSize = 20
	}

	total, err := query.Count(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count competitions: " + err.Error())
	}

	offset := (q.Page - 1) * q.PageSize
	competitions, err := query.
		Limit(q.PageSize).
		Offset(offset).
		Order(ent.Desc(competition.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list competitions: " + err.Error())
	}

	items := make([]models.CompetitionResponse, 0, len(competitions))
	for _, c := range competitions {
		items = append(items, s.buildResponse(ctx, c))
	}

	return &models.PaginatedResponse{
		Items:      items,
		Total:      total,
		Page:       q.Page,
		PageSize:   q.PageSize,
		TotalPages: int(math.Ceil(float64(total) / float64(q.PageSize))),
	}, nil
}

func (s *CompetitionService) GetByID(ctx context.Context, id int) (*models.CompetitionResponse, error) {
	c, err := s.client.Competition.Query().
		Where(competition.ID(id)).
		WithCreator().
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("competition not found")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to get competition: " + err.Error())
	}

	resp := s.buildResponse(ctx, c)
	return &resp, nil
}

func (s *CompetitionService) Create(ctx context.Context, req *models.CreateCompetitionRequest, userID int, username, ip string) (*ent.Competition, error) {
	startTime, err := time.Parse(time.RFC3339, *req.StartTime)
	if err != nil {
		return nil, apperr.ErrBadRequest.WithMessage("invalid start_time format, use RFC3339")
	}
	endTime, err := time.Parse(time.RFC3339, *req.EndTime)
	if err != nil {
		return nil, apperr.ErrBadRequest.WithMessage("invalid end_time format, use RFC3339")
	}
	if !endTime.After(startTime) {
		return nil, apperr.ErrBadRequest.WithMessage("end_time must be after start_time")
	}

	var result *ent.Competition
	err = tx.WithTx(ctx, s.client, func(t *ent.Tx) error {
		builder := t.Competition.Create().
			SetTitle(req.Title).
			SetDescription(req.Description).
			SetMode(competition.Mode(req.Mode)).
			SetMaxTeams(req.MaxTeams).
			SetMaxTeamSize(req.MaxTeamSize).
			SetIsPublic(req.IsPublic).
			SetPassword(req.Password).
			SetBannerURL(req.BannerURL).
			SetRules(req.Rules).
			SetCreatedBy(userID)

		if req.ScoringConfig != nil {
			builder = builder.SetScoringConfig(req.ScoringConfig)
		}

		if req.StartTime != nil {
			if t, err := time.Parse(time.RFC3339, *req.StartTime); err == nil {
				builder = builder.SetStartTime(t)
			}
		}
		if req.EndTime != nil {
			if t, err := time.Parse(time.RFC3339, *req.EndTime); err == nil {
				builder = builder.SetEndTime(t)
			}
		}
		if req.RegistrationStart != nil {
			if t, err := time.Parse(time.RFC3339, *req.RegistrationStart); err == nil {
				builder = builder.SetRegistrationStart(t)
			}
		}
		if req.RegistrationEnd != nil {
			if t, err := time.Parse(time.RFC3339, *req.RegistrationEnd); err == nil {
				builder = builder.SetRegistrationEnd(t)
			}
		}
		if req.ScoreboardFreezeAt != nil {
			if t, err := time.Parse(time.RFC3339, *req.ScoreboardFreezeAt); err == nil {
				builder = builder.SetScoreboardFreezeAt(t)
			}
		}
		if req.SubmitIntervalSeconds != nil {
			builder = builder.SetSubmitIntervalSeconds(*req.SubmitIntervalSeconds)
		}

		c, err := builder.Save(ctx)
		if err != nil {
			return apperr.ErrInternal.WithMessage("failed to create competition: " + err.Error())
		}

		_, err = t.Activity.Create().
			SetUserID(userID).
			SetUsername(username).
			SetAction("competition.create").
			SetResourceType("competition").
			SetResourceID(c.ID).
			SetDetail(fmt.Sprintf("created competition: %s", c.Title)).
			SetIP(ip).
			Save(ctx)
		if err != nil {
			return apperr.ErrInternal.WithMessage("failed to log activity: " + err.Error())
		}

		result = c
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *CompetitionService) Update(ctx context.Context, id int, req *models.UpdateCompetitionRequest, userID int, username, ip string) (*ent.Competition, error) {
	var result *ent.Competition
	err := tx.WithTx(ctx, s.client, func(t *ent.Tx) error {
		builder := t.Competition.UpdateOneID(id)

		if req.Title != nil {
			builder = builder.SetTitle(*req.Title)
		}
		if req.Description != nil {
			builder = builder.SetDescription(*req.Description)
		}
		if req.MaxTeams != nil {
			builder = builder.SetMaxTeams(*req.MaxTeams)
		}
		if req.MaxTeamSize != nil {
			builder = builder.SetMaxTeamSize(*req.MaxTeamSize)
		}
		if req.IsPublic != nil {
			builder = builder.SetIsPublic(*req.IsPublic)
		}
		if req.Password != nil {
			builder = builder.SetPassword(*req.Password)
		}
		if req.ScoringConfig != nil {
			builder = builder.SetScoringConfig(req.ScoringConfig)
		}
		if req.BannerURL != nil {
			builder = builder.SetBannerURL(*req.BannerURL)
		}
		if req.Rules != nil {
			builder = builder.SetRules(*req.Rules)
		}
		if req.StartTime != nil {
			if t, err := time.Parse(time.RFC3339, *req.StartTime); err == nil {
				builder = builder.SetStartTime(t)
			}
		}
		if req.EndTime != nil {
			if t, err := time.Parse(time.RFC3339, *req.EndTime); err == nil {
				builder = builder.SetEndTime(t)
			}
		}
		if req.RegistrationStart != nil {
			if t, err := time.Parse(time.RFC3339, *req.RegistrationStart); err == nil {
				builder = builder.SetRegistrationStart(t)
			}
		}
		if req.RegistrationEnd != nil {
			if t, err := time.Parse(time.RFC3339, *req.RegistrationEnd); err == nil {
				builder = builder.SetRegistrationEnd(t)
			}
		}
		if req.ScoreboardFreezeAt != nil {
			if t, err := time.Parse(time.RFC3339, *req.ScoreboardFreezeAt); err == nil {
				builder = builder.SetScoreboardFreezeAt(t)
			}
		}
		if req.SubmitIntervalSeconds != nil {
			builder = builder.SetSubmitIntervalSeconds(*req.SubmitIntervalSeconds)
		}

		c, err := builder.Save(ctx)
		if err != nil {
			if ent.IsNotFound(err) {
				return apperr.ErrNotFound.WithMessage("competition not found")
			}
			return apperr.ErrInternal.WithMessage("failed to update competition: " + err.Error())
		}

		_, err = t.Activity.Create().
			SetUserID(userID).
			SetUsername(username).
			SetAction("competition.update").
			SetResourceType("competition").
			SetResourceID(c.ID).
			SetDetail(fmt.Sprintf("updated competition: %s", c.Title)).
			SetIP(ip).
			Save(ctx)
		if err != nil {
			return apperr.ErrInternal.WithMessage("failed to log activity: " + err.Error())
		}

		result = c
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *CompetitionService) UpdateStatus(ctx context.Context, id int, status string, userID int, username, ip string) error {
	return tx.WithTx(ctx, s.client, func(t *ent.Tx) error {
		c, err := t.Competition.UpdateOneID(id).
			SetStatus(competition.Status(status)).
			Save(ctx)
		if err != nil {
			if ent.IsNotFound(err) {
				return apperr.ErrNotFound.WithMessage("competition not found")
			}
			return apperr.ErrInternal.WithMessage("failed to update status: " + err.Error())
		}

		_, err = t.Activity.Create().
			SetUserID(userID).
			SetUsername(username).
			SetAction("competition.status").
			SetResourceType("competition").
			SetResourceID(c.ID).
			SetDetail(fmt.Sprintf("changed competition status to %s: %s", status, c.Title)).
			SetIP(ip).
			Save(ctx)
		if err != nil {
			return apperr.ErrInternal.WithMessage("failed to log activity: " + err.Error())
		}

		return nil
	})
}

func (s *CompetitionService) Delete(ctx context.Context, id int, userID int, username, ip string) error {
	c, err := s.client.Competition.Get(ctx, id)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("competition not found")
		}
		return apperr.ErrInternal.WithMessage("failed to get competition: " + err.Error())
	}

	return tx.WithTx(ctx, s.client, func(t *ent.Tx) error {
		if err := t.Competition.DeleteOneID(id).Exec(ctx); err != nil {
			return apperr.ErrInternal.WithMessage("failed to delete competition: " + err.Error())
		}

		_, err := t.Activity.Create().
			SetUserID(userID).
			SetUsername(username).
			SetAction("competition.delete").
			SetResourceType("competition").
			SetResourceID(id).
			SetDetail(fmt.Sprintf("deleted competition: %s", c.Title)).
			SetIP(ip).
			Save(ctx)
		if err != nil {
			return apperr.ErrInternal.WithMessage("failed to log activity: " + err.Error())
		}

		return nil
	})
}

func (s *CompetitionService) AttachChallenge(ctx context.Context, competitionID int, req *models.AttachChallengeRequest) error {
	_, err := s.client.CompetitionChallenge.Create().
		SetCompetitionID(competitionID).
		SetChallengeID(req.ChallengeID).
		SetOrderNum(req.OrderNum).
		SetIsVisible(req.IsVisible).
		Save(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to attach challenge: " + err.Error())
	}
	return nil
}

func (s *CompetitionService) DetachChallenge(ctx context.Context, competitionID, challengeID int) error {
	_, err := s.client.CompetitionChallenge.Delete().
		Where(
			competitionchallenge.CompetitionID(competitionID),
			competitionchallenge.ChallengeID(challengeID),
		).Exec(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to detach challenge: " + err.Error())
	}
	return nil
}

func (s *CompetitionService) BatchAttachChallenges(ctx context.Context, competitionID int, reqs []models.AttachChallengeRequest) (int, error) {
	attached := 0
	for _, req := range reqs {
		_, err := s.client.CompetitionChallenge.Create().
			SetCompetitionID(competitionID).
			SetChallengeID(req.ChallengeID).
			SetOrderNum(req.OrderNum).
			SetIsVisible(req.IsVisible).
			Save(ctx)
		if err == nil {
			attached++
		}
	}
	return attached, nil
}

func (s *CompetitionService) ReleaseChallenges(ctx context.Context, competitionID int, challengeIDs []int) (int, error) {
	now := time.Now()
	released := 0
	for _, cid := range challengeIDs {
		_, err := s.client.CompetitionChallenge.Update().
			Where(
				competitionchallenge.CompetitionID(competitionID),
				competitionchallenge.ChallengeID(cid),
			).
			SetIsVisible(true).
			SetReleasedAt(now).
			Save(ctx)
		if err == nil {
			released++
		}
	}
	return released, nil
}

func (s *CompetitionService) ListCompetitionChallenges(ctx context.Context, competitionID int) ([]models.CompetitionChallengeResponse, error) {
	ccs, err := s.client.CompetitionChallenge.Query().
		Where(competitionchallenge.CompetitionID(competitionID)).
		WithChallenge().
		Order(ent.Asc(competitionchallenge.FieldOrderNum)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list competition challenges: " + err.Error())
	}

	items := make([]models.CompetitionChallengeResponse, 0, len(ccs))
	for _, cc := range ccs {
		item := models.CompetitionChallengeResponse{
			ID:            cc.ID,
			CompetitionID: cc.CompetitionID,
			ChallengeID:   cc.ChallengeID,
			OrderNum:      cc.OrderNum,
			IsVisible:     cc.IsVisible,
			ExtraScore:    cc.ExtraScore,
			CreatedAt:     cc.CreatedAt.Format("2006-01-02T15:04:05Z"),
		}
		if cc.ReleasedAt != nil {
			t := cc.ReleasedAt.Format("2006-01-02T15:04:05Z")
			item.ReleasedAt = &t
		}
		if cc.Edges.Challenge != nil {
			item.ChallengeTitle = cc.Edges.Challenge.Title
			item.Category = cc.Edges.Challenge.Category
			item.Difficulty = string(cc.Edges.Challenge.Difficulty)
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *CompetitionService) ListRegistrations(ctx context.Context, competitionID int) ([]models.RegistrationResponse, error) {
	regs, err := s.client.TeamRegistration.Query().
		Where(teamregistration.CompetitionID(competitionID)).
		WithTeam().
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list registrations: " + err.Error())
	}

	items := make([]models.RegistrationResponse, 0, len(regs))
	for _, r := range regs {
		item := models.RegistrationResponse{
			ID:            r.ID,
			TeamID:        r.TeamID,
			CompetitionID: r.CompetitionID,
			Status:        string(r.Status),
			TeamRole:      string(r.TeamRole),
			RegisteredAt:  r.RegisteredAt.Format("2006-01-02T15:04:05Z"),
		}
		if r.Edges.Team != nil {
			item.TeamName = r.Edges.Team.Name
		}
		if r.ReviewedAt != nil {
			t := r.ReviewedAt.Format("2006-01-02T15:04:05Z")
			item.ReviewedAt = t
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *CompetitionService) ReviewRegistration(ctx context.Context, regID int, status string) error {
	now := time.Now()
	_, err := s.client.TeamRegistration.UpdateOneID(regID).
		SetStatus(teamregistration.Status(status)).
		SetReviewedAt(now).
		Save(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("registration not found")
		}
		return apperr.ErrInternal.WithMessage("failed to review registration: " + err.Error())
	}
	return nil
}

func (s *CompetitionService) ListPublic(ctx context.Context, q *models.CompetitionListQuery) (*models.PaginatedResponse, error) {
	query := s.client.Competition.Query().
		Where(competition.IsPublic(true)).
		Where(competition.StatusNotIn(competition.StatusDraft, competition.StatusArchived))

	if q.Search != "" {
		query = query.Where(competition.TitleContains(q.Search))
	}
	if q.Mode != "" {
		query = query.Where(competition.ModeEQ(competition.Mode(q.Mode)))
	}

	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 || q.PageSize > 100 {
		q.PageSize = 20
	}

	total, err := query.Count(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count competitions: " + err.Error())
	}

	offset := (q.Page - 1) * q.PageSize
	competitions, err := query.
		Limit(q.PageSize).
		Offset(offset).
		Order(ent.Desc(competition.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list competitions: " + err.Error())
	}

	items := make([]models.CompetitionPortalResponse, 0, len(competitions))
	for _, c := range competitions {
		items = append(items, s.buildPortalResponse(ctx, c, 0))
	}

	return &models.PaginatedResponse{
		Items: items, Total: total, Page: q.Page,
		PageSize:   q.PageSize,
		TotalPages: int(math.Ceil(float64(total) / float64(q.PageSize))),
	}, nil
}

func (s *CompetitionService) ListPublicForTeam(ctx context.Context, q *models.CompetitionListQuery, teamID int) (*models.PaginatedResponse, error) {
	query := s.client.Competition.Query().
		Where(competition.IsPublic(true)).
		Where(competition.StatusNotIn(competition.StatusDraft, competition.StatusArchived))
	if q.Search != "" {
		query = query.Where(competition.TitleContains(q.Search))
	}
	if q.Mode != "" {
		query = query.Where(competition.ModeEQ(competition.Mode(q.Mode)))
	}
	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 || q.PageSize > 100 {
		q.PageSize = 20
	}

	total, _ := query.Count(ctx)
	competitions, err := query.Limit(q.PageSize).Offset((q.Page - 1) * q.PageSize).Order(ent.Desc(competition.FieldCreatedAt)).All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list competitions: " + err.Error())
	}

	items := make([]models.CompetitionPortalResponse, 0, len(competitions))
	for _, c := range competitions {
		items = append(items, s.buildPortalResponse(ctx, c, teamID))
	}
	return &models.PaginatedResponse{Items: items, Total: total, Page: q.Page, PageSize: q.PageSize, TotalPages: int(math.Ceil(float64(total) / float64(q.PageSize)))}, nil
}

func (s *CompetitionService) GetByIDForTeam(ctx context.Context, id, teamID int) (*models.CompetitionPortalResponse, error) {
	c, err := s.client.Competition.Query().Where(competition.ID(id)).Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("competition not found")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to get competition: " + err.Error())
	}
	resp := s.buildPortalResponse(ctx, c, teamID)
	return &resp, nil
}

func (s *CompetitionService) buildResponse(ctx context.Context, c *ent.Competition) models.CompetitionResponse {
	resp := models.CompetitionResponse{
		ID:          c.ID,
		Title:       c.Title,
		Description: c.Description,
		Mode:        string(c.Mode),
		Status:      string(c.Status),
		MaxTeams:    c.MaxTeams,
		MaxTeamSize: c.MaxTeamSize,
		IsPublic:    c.IsPublic,
		BannerURL:   c.BannerURL,
		Rules:       c.Rules,
		CreatedBy:   c.CreatedBy,
		CreatedAt:   c.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:   c.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}

	if c.StartTime != nil {
		t := c.StartTime.Format(time.RFC3339)
		resp.StartTime = &t
	}
	if c.EndTime != nil {
		t := c.EndTime.Format(time.RFC3339)
		resp.EndTime = &t
	}
	if c.RegistrationStart != nil {
		t := c.RegistrationStart.Format(time.RFC3339)
		resp.RegistrationStart = &t
	}
	if c.RegistrationEnd != nil {
		t := c.RegistrationEnd.Format(time.RFC3339)
		resp.RegistrationEnd = &t
	}
	if c.ScoringConfig != nil {
		resp.ScoringConfig = c.ScoringConfig
	}
	if c.ScoreboardFreezeAt != nil {
		t := c.ScoreboardFreezeAt.Format(time.RFC3339)
		resp.ScoreboardFreezeAt = &t
	}
	resp.SubmitIntervalSeconds = c.SubmitIntervalSeconds

	if c.Edges.Creator != nil {
		resp.CreatorName = c.Edges.Creator.Username
	}

	teamCount, _ := s.client.TeamRegistration.Query().
		Where(
			teamregistration.CompetitionID(c.ID),
			teamregistration.StatusEQ(teamregistration.StatusApproved),
			teamregistration.TeamRoleNotIn(teamregistration.TeamRoleJudge, teamregistration.TeamRoleWhite),
		).
		Count(ctx)
	resp.TeamCount = teamCount

	challengeCount, _ := s.client.CompetitionChallenge.Query().
		Where(competitionchallenge.CompetitionID(c.ID)).
		Count(ctx)
	resp.ChallengeCount = challengeCount

	return resp
}

func (s *CompetitionService) buildPortalResponse(ctx context.Context, c *ent.Competition, teamID int) models.CompetitionPortalResponse {
	resp := models.CompetitionPortalResponse{
		ID:          c.ID,
		Title:       c.Title,
		Description: c.Description,
		Mode:        string(c.Mode),
		Status:      string(c.Status),
		MaxTeams:    c.MaxTeams,
		MaxTeamSize: c.MaxTeamSize,
		IsPublic:    c.IsPublic,
		BannerURL:   c.BannerURL,
		Rules:       c.Rules,
	}

	if c.StartTime != nil {
		t := c.StartTime.Format(time.RFC3339)
		resp.StartTime = &t
	}
	if c.EndTime != nil {
		t := c.EndTime.Format(time.RFC3339)
		resp.EndTime = &t
	}
	if c.RegistrationStart != nil {
		t := c.RegistrationStart.Format(time.RFC3339)
		resp.RegistrationStart = &t
	}
	if c.RegistrationEnd != nil {
		t := c.RegistrationEnd.Format(time.RFC3339)
		resp.RegistrationEnd = &t
	}

	teamCount, _ := s.client.TeamRegistration.Query().
		Where(
			teamregistration.CompetitionID(c.ID),
			teamregistration.StatusEQ(teamregistration.StatusApproved),
			teamregistration.TeamRoleNotIn(teamregistration.TeamRoleJudge, teamregistration.TeamRoleWhite),
		).
		Count(ctx)
	resp.TeamCount = teamCount

	if string(c.Mode) == "red_blue" {
		redCount, _ := s.client.Objective.Query().
			Where(objective.CompetitionID(c.ID), objective.TeamRoleEQ(objective.TeamRoleRed)).
			Count(ctx)
		blueCount, _ := s.client.Objective.Query().
			Where(objective.CompetitionID(c.ID), objective.TeamRoleEQ(objective.TeamRoleBlue)).
			Count(ctx)
		if redCount > blueCount {
			resp.ChallengeCount = redCount
		} else {
			resp.ChallengeCount = blueCount
		}
	} else {
		challengeCount, _ := s.client.CompetitionChallenge.Query().
			Where(competitionchallenge.CompetitionID(c.ID), competitionchallenge.IsVisible(true)).
			Count(ctx)
		resp.ChallengeCount = challengeCount
	}

	if teamID > 0 {
		reg, err := s.client.TeamRegistration.Query().
			Where(teamregistration.CompetitionID(c.ID), teamregistration.TeamID(teamID)).
			Only(ctx)
		if err == nil {
			resp.IsRegistered = true
			resp.RegistrationStatus = string(reg.Status)
			resp.TeamRole = string(reg.TeamRole)
		}
	}

	return resp
}
