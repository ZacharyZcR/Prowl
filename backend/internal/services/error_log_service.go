package services

import (
	"context"
	"crypto/sha256"
	"fmt"
	"math"
	"time"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/errorlog"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type ErrorLogService struct {
	client *ent.Client
}

func NewErrorLogService(client *ent.Client) *ErrorLogService {
	return &ErrorLogService{client: client}
}

type RecordInput struct {
	Source     string
	ErrType   string
	Message   string
	Stack     string
	URL       string
	Method    string
	StatusCode int
	Params    map[string]interface{}
	UserAgent string
	RequestID string
	UserID    int
}

func computeFingerprint(errType, message string) string {
	msg := message
	if len(msg) > 200 {
		msg = msg[:200]
	}
	h := sha256.Sum256([]byte(errType + "|" + msg))
	return fmt.Sprintf("%x", h)
}

func deriveSeverity(errType string, statusCode int) errorlog.Severity {
	switch {
	case errType == "panic":
		return errorlog.SeverityCritical
	case statusCode >= 500:
		return errorlog.SeverityHigh
	case errType == "auth_error" || errType == "permission_error":
		return errorlog.SeverityMedium
	default:
		return errorlog.SeverityLow
	}
}

func (s *ErrorLogService) Record(ctx context.Context, input *RecordInput) error {
	fp := computeFingerprint(input.ErrType, input.Message)
	severity := deriveSeverity(input.ErrType, input.StatusCode)
	now := time.Now()

	existing, err := s.client.ErrorLog.Query().
		Where(errorlog.Fingerprint(fp)).
		Only(ctx)

	if err == nil {
		// 存在：累加计数，更新 last_seen_at
		update := s.client.ErrorLog.UpdateOne(existing).
			AddOccurrenceCount(1).
			SetLastSeenAt(now)
		// 如果已解决，重新打开
		if existing.Resolved {
			update = update.
				SetResolved(false).
				SetResolvedBy(0).
				ClearResolvedAt()
		}
		_, err = update.Save(ctx)
		return err
	}

	if !ent.IsNotFound(err) {
		return err
	}

	// 不存在：创建新记录
	builder := s.client.ErrorLog.Create().
		SetSource(errorlog.Source(input.Source)).
		SetErrType(input.ErrType).
		SetMessage(input.Message).
		SetStack(input.Stack).
		SetURL(input.URL).
		SetMethod(input.Method).
		SetStatusCode(input.StatusCode).
		SetUserAgent(input.UserAgent).
		SetRequestID(input.RequestID).
		SetUserID(input.UserID).
		SetFingerprint(fp).
		SetSeverity(severity).
		SetLastSeenAt(now)

	if input.Params != nil {
		builder = builder.SetParams(input.Params)
	}

	_, err = builder.Save(ctx)
	return err
}

func (s *ErrorLogService) List(ctx context.Context, q *models.ErrorLogQuery) (*models.PaginatedResponse, error) {
	query := s.client.ErrorLog.Query()

	if q.Source != "" {
		query = query.Where(errorlog.SourceEQ(errorlog.Source(q.Source)))
	}
	if q.ErrType != "" {
		query = query.Where(errorlog.ErrType(q.ErrType))
	}
	if q.Severity != "" {
		query = query.Where(errorlog.SeverityEQ(errorlog.Severity(q.Severity)))
	}
	if q.Resolved != nil {
		query = query.Where(errorlog.Resolved(*q.Resolved))
	}
	if q.Search != "" {
		query = query.Where(
			errorlog.Or(
				errorlog.MessageContains(q.Search),
				errorlog.ErrTypeContains(q.Search),
				errorlog.URLContains(q.Search),
			),
		)
	}

	total, err := query.Count(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count error logs: " + err.Error())
	}

	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 || q.PageSize > 100 {
		q.PageSize = 20
	}

	offset := (q.Page - 1) * q.PageSize
	logs, err := query.
		Limit(q.PageSize).
		Offset(offset).
		Order(ent.Desc(errorlog.FieldLastSeenAt)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list error logs: " + err.Error())
	}

	items := make([]models.ErrorLogResponse, 0, len(logs))
	for _, l := range logs {
		items = append(items, buildErrorLogResponse(l))
	}

	return &models.PaginatedResponse{
		Items:      items,
		Total:      total,
		Page:       q.Page,
		PageSize:   q.PageSize,
		TotalPages: int(math.Ceil(float64(total) / float64(q.PageSize))),
	}, nil
}

func (s *ErrorLogService) GetByID(ctx context.Context, id int) (*ent.ErrorLog, error) {
	l, err := s.client.ErrorLog.Get(ctx, id)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("error log not found")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to get error log: " + err.Error())
	}
	return l, nil
}

func (s *ErrorLogService) Resolve(ctx context.Context, id int, userID int) error {
	now := time.Now()
	_, err := s.client.ErrorLog.UpdateOneID(id).
		SetResolved(true).
		SetResolvedBy(userID).
		SetResolvedAt(now).
		Save(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("error log not found")
		}
		return apperr.ErrInternal.WithMessage("failed to resolve error log: " + err.Error())
	}
	return nil
}

func (s *ErrorLogService) Unresolve(ctx context.Context, id int) error {
	_, err := s.client.ErrorLog.UpdateOneID(id).
		SetResolved(false).
		SetResolvedBy(0).
		ClearResolvedAt().
		Save(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("error log not found")
		}
		return apperr.ErrInternal.WithMessage("failed to unresolve error log: " + err.Error())
	}
	return nil
}

func (s *ErrorLogService) BulkResolve(ctx context.Context, ids []int, userID int) error {
	now := time.Now()
	_, err := s.client.ErrorLog.Update().
		Where(errorlog.IDIn(ids...)).
		SetResolved(true).
		SetResolvedBy(userID).
		SetResolvedAt(now).
		Save(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to bulk resolve error logs: " + err.Error())
	}
	return nil
}

func (s *ErrorLogService) Statistics(ctx context.Context) (*models.ErrorLogStats, error) {
	total, err := s.client.ErrorLog.Query().Count(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count error logs: " + err.Error())
	}

	unresolved, err := s.client.ErrorLog.Query().
		Where(errorlog.Resolved(false)).
		Count(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count unresolved: " + err.Error())
	}

	stats := &models.ErrorLogStats{
		Total:      total,
		Unresolved: unresolved,
		BySeverity: make(map[string]int),
		BySource:   make(map[string]int),
		ByType:     make(map[string]int),
	}

	// 按 severity 统计
	for _, sev := range []errorlog.Severity{errorlog.SeverityCritical, errorlog.SeverityHigh, errorlog.SeverityMedium, errorlog.SeverityLow} {
		count, err := s.client.ErrorLog.Query().
			Where(errorlog.SeverityEQ(sev)).
			Count(ctx)
		if err != nil {
			return nil, apperr.ErrInternal.WithMessage("failed to count by severity: " + err.Error())
		}
		stats.BySeverity[string(sev)] = count
	}

	// 按 source 统计
	for _, src := range []errorlog.Source{errorlog.SourceFrontend, errorlog.SourceBackend} {
		count, err := s.client.ErrorLog.Query().
			Where(errorlog.SourceEQ(src)).
			Count(ctx)
		if err != nil {
			return nil, apperr.ErrInternal.WithMessage("failed to count by source: " + err.Error())
		}
		stats.BySource[string(src)] = count
	}

	// 按 err_type 统计（取所有记录的 err_type 去重统计）
	logs, err := s.client.ErrorLog.Query().
		Select(errorlog.FieldErrType).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count by type: " + err.Error())
	}
	typeCounts := make(map[string]int)
	for _, l := range logs {
		typeCounts[l.ErrType]++
	}
	stats.ByType = typeCounts

	return stats, nil
}

func buildErrorLogResponse(l *ent.ErrorLog) models.ErrorLogResponse {
	resp := models.ErrorLogResponse{
		ID:              l.ID,
		Source:          string(l.Source),
		ErrType:         l.ErrType,
		Message:         l.Message,
		Stack:           l.Stack,
		URL:             l.URL,
		Method:          l.Method,
		StatusCode:      l.StatusCode,
		Params:          l.Params,
		UserAgent:       l.UserAgent,
		RequestID:       l.RequestID,
		UserID:          l.UserID,
		Fingerprint:     l.Fingerprint,
		OccurrenceCount: l.OccurrenceCount,
		FirstSeenAt:     l.FirstSeenAt.Format("2006-01-02T15:04:05Z"),
		LastSeenAt:      l.LastSeenAt.Format("2006-01-02T15:04:05Z"),
		Resolved:        l.Resolved,
		ResolvedBy:      l.ResolvedBy,
		Severity:        string(l.Severity),
		CreatedAt:       l.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
	if l.ResolvedAt != nil {
		resp.ResolvedAt = l.ResolvedAt.Format("2006-01-02T15:04:05Z")
	}
	return resp
}

func BuildErrorLogResponse(l *ent.ErrorLog) models.ErrorLogResponse {
	return buildErrorLogResponse(l)
}
