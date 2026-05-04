package services

import (
	"context"
	"math"
	"time"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/loginlog"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type LoginLogService struct {
	client *ent.Client
}

func NewLoginLogService(client *ent.Client) *LoginLogService {
	return &LoginLogService{client: client}
}

type LoginLogInput struct {
	UserID        int
	Username      string
	IP            string
	UserAgent     string
	Success       bool
	FailureReason string
}

func (s *LoginLogService) Record(ctx context.Context, input *LoginLogInput) error {
	builder := s.client.LoginLog.Create().
		SetUserID(input.UserID).
		SetUsername(input.Username).
		SetIP(input.IP).
		SetUserAgent(input.UserAgent).
		SetSuccess(input.Success).
		SetFailureReason(input.FailureReason)

	_, err := builder.Save(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to record login log: " + err.Error())
	}
	return nil
}

func (s *LoginLogService) List(ctx context.Context, q *models.LoginLogListQuery) (*models.PaginatedResponse, error) {
	query := s.client.LoginLog.Query()

	if q.Username != "" {
		query = query.Where(loginlog.UsernameContains(q.Username))
	}
	if q.IP != "" {
		query = query.Where(loginlog.IPContains(q.IP))
	}
	if q.Success == "true" {
		query = query.Where(loginlog.Success(true))
	} else if q.Success == "false" {
		query = query.Where(loginlog.Success(false))
	}

	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 || q.PageSize > 100 {
		q.PageSize = 20
	}

	total, err := query.Count(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count login logs: " + err.Error())
	}

	offset := (q.Page - 1) * q.PageSize
	logs, err := query.
		Limit(q.PageSize).
		Offset(offset).
		Order(ent.Desc(loginlog.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list login logs: " + err.Error())
	}

	items := make([]models.LoginLogResponse, 0, len(logs))
	for _, l := range logs {
		items = append(items, toLoginLogResponse(l))
	}

	return &models.PaginatedResponse{
		Items:      items,
		Total:      total,
		Page:       q.Page,
		PageSize:   q.PageSize,
		TotalPages: int(math.Ceil(float64(total) / float64(q.PageSize))),
	}, nil
}

type LoginLogStats struct {
	Total        int     `json:"total"`
	TodayCount   int     `json:"today_count"`
	SuccessCount int     `json:"success_count"`
	FailureCount int     `json:"failure_count"`
	SuccessRate  float64 `json:"success_rate"`
}

func (s *LoginLogService) Statistics(ctx context.Context) (*LoginLogStats, error) {
	total, err := s.client.LoginLog.Query().Count(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count login logs: " + err.Error())
	}

	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	todayCount, err := s.client.LoginLog.Query().
		Where(loginlog.CreatedAtGTE(todayStart)).
		Count(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count today login logs: " + err.Error())
	}

	successCount, err := s.client.LoginLog.Query().
		Where(loginlog.Success(true)).
		Count(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count success login logs: " + err.Error())
	}

	failureCount := total - successCount

	var successRate float64
	if total > 0 {
		successRate = float64(successCount) / float64(total) * 100
	}

	return &LoginLogStats{
		Total:        total,
		TodayCount:   todayCount,
		SuccessCount: successCount,
		FailureCount: failureCount,
		SuccessRate:  successRate,
	}, nil
}

func toLoginLogResponse(l *ent.LoginLog) models.LoginLogResponse {
	return models.LoginLogResponse{
		ID:            l.ID,
		UserID:        l.UserID,
		Username:      l.Username,
		IP:            l.IP,
		UserAgent:     l.UserAgent,
		Success:       l.Success,
		FailureReason: l.FailureReason,
		Location:      l.Location,
		CreatedAt:     l.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
}
