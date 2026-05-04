package services

import (
	"context"
	"math"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/writeup"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type WriteupService struct {
	client *ent.Client
}

func NewWriteupService(client *ent.Client) *WriteupService {
	return &WriteupService{client: client}
}

func (s *WriteupService) Create(ctx context.Context, competitionID, teamID, userID int, req *models.CreateWriteupRequest) (*ent.Writeup, error) {
	exists, _ := s.client.Writeup.Query().
		Where(
			writeup.CompetitionID(competitionID),
			writeup.ChallengeID(req.ChallengeID),
			writeup.TeamID(teamID),
		).Exist(ctx)
	if exists {
		return nil, apperr.ErrBadRequest.WithMessage("writeup already submitted for this challenge")
	}

	w, err := s.client.Writeup.Create().
		SetCompetitionID(competitionID).
		SetChallengeID(req.ChallengeID).
		SetTeamID(teamID).
		SetUserID(userID).
		SetContent(req.Content).
		SetFileID(req.FileID).
		Save(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to create writeup: " + err.Error())
	}
	return w, nil
}

func (s *WriteupService) List(ctx context.Context, q *models.WriteupListQuery) (*models.PaginatedResponse, error) {
	query := s.client.Writeup.Query().
		WithChallenge().
		WithTeam().
		WithUser()

	if q.CompetitionID > 0 {
		query = query.Where(writeup.CompetitionID(q.CompetitionID))
	}
	if q.ChallengeID > 0 {
		query = query.Where(writeup.ChallengeID(q.ChallengeID))
	}
	if q.TeamID > 0 {
		query = query.Where(writeup.TeamID(q.TeamID))
	}
	if q.Status != "" {
		query = query.Where(writeup.StatusEQ(writeup.Status(q.Status)))
	}

	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 || q.PageSize > 100 {
		q.PageSize = 20
	}

	total, err := query.Count(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count writeups: " + err.Error())
	}

	offset := (q.Page - 1) * q.PageSize
	writeups, err := query.
		Limit(q.PageSize).
		Offset(offset).
		Order(ent.Desc(writeup.FieldSubmittedAt)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list writeups: " + err.Error())
	}

	items := make([]models.WriteupResponse, 0, len(writeups))
	for _, w := range writeups {
		items = append(items, buildWriteupResponse(w))
	}

	return &models.PaginatedResponse{
		Items:      items,
		Total:      total,
		Page:       q.Page,
		PageSize:   q.PageSize,
		TotalPages: int(math.Ceil(float64(total) / float64(q.PageSize))),
	}, nil
}

func (s *WriteupService) Review(ctx context.Context, id int, req *models.ReviewWriteupRequest, reviewerID int) error {
	_, err := s.client.Writeup.UpdateOneID(id).
		SetStatus(writeup.Status(req.Status)).
		SetReviewerComment(req.Comment).
		SetReviewedBy(reviewerID).
		Save(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("writeup not found")
		}
		return apperr.ErrInternal.WithMessage("failed to review writeup: " + err.Error())
	}
	return nil
}

func buildWriteupResponse(w *ent.Writeup) models.WriteupResponse {
	resp := models.WriteupResponse{
		ID:              w.ID,
		CompetitionID:   w.CompetitionID,
		ChallengeID:     w.ChallengeID,
		TeamID:          w.TeamID,
		UserID:          w.UserID,
		Content:         w.Content,
		FileID:          w.FileID,
		Status:          string(w.Status),
		ReviewerComment: w.ReviewerComment,
		ReviewedBy:      w.ReviewedBy,
		SubmittedAt:     w.SubmittedAt.Format("2006-01-02T15:04:05Z"),
	}
	if w.Edges.Challenge != nil {
		resp.ChallengeName = w.Edges.Challenge.Title
	}
	if w.Edges.Team != nil {
		resp.TeamName = w.Edges.Team.Name
	}
	if w.Edges.User != nil {
		resp.Username = w.Edges.User.Username
	}
	return resp
}
