package services

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"math"
	"time"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/activity"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type ActivityService struct {
	client *ent.Client
}

func NewActivityService(client *ent.Client) *ActivityService {
	return &ActivityService{client: client}
}

type LogInput struct {
	UserID       int
	Username     string
	Action       string
	ResourceType string
	ResourceID   int
	Detail       string
	Details      map[string]interface{}
	IP           string
	UserAgent    string
	Method       string
	Path         string
	StatusCode   int
}

func (s *ActivityService) Log(ctx context.Context, userID int, username, action, resourceType string, resourceID int, detail, ip string) error {
	return s.LogEntry(ctx, &LogInput{
		UserID:       userID,
		Username:     username,
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		Detail:       detail,
		IP:           ip,
	})
}

func (s *ActivityService) LogEntry(ctx context.Context, input *LogInput) error {
	builder := s.client.Activity.Create().
		SetUserID(input.UserID).
		SetUsername(input.Username).
		SetAction(input.Action).
		SetResourceType(input.ResourceType).
		SetResourceID(input.ResourceID).
		SetDetail(input.Detail).
		SetIP(input.IP).
		SetUserAgent(input.UserAgent).
		SetMethod(input.Method).
		SetPath(input.Path).
		SetStatusCode(input.StatusCode)

	if input.Details != nil {
		builder = builder.SetDetails(input.Details)
	}

	_, err := builder.Save(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to log activity: " + err.Error())
	}
	return nil
}

func (s *ActivityService) List(ctx context.Context, q *models.ActivityListQuery) (*models.PaginatedResponse, error) {
	query := s.client.Activity.Query()

	if q.ResourceType != "" {
		query = query.Where(activity.ResourceType(q.ResourceType))
	}
	if q.UserID != 0 {
		query = query.Where(activity.UserID(q.UserID))
	}
	if q.Action != "" {
		query = query.Where(activity.ActionContains(q.Action))
	}

	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 || q.PageSize > 100 {
		q.PageSize = 20
	}

	total, err := query.Count(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count activities: " + err.Error())
	}

	offset := (q.Page - 1) * q.PageSize
	activities, err := query.
		Limit(q.PageSize).
		Offset(offset).
		Order(ent.Desc(activity.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list activities: " + err.Error())
	}

	items := make([]models.ActivityResponse, 0, len(activities))
	for _, a := range activities {
		items = append(items, toActivityResponse(a))
	}

	return &models.PaginatedResponse{
		Items:      items,
		Total:      total,
		Page:       q.Page,
		PageSize:   q.PageSize,
		TotalPages: int(math.Ceil(float64(total) / float64(q.PageSize))),
	}, nil
}

type ActivityStats struct {
	Total          int                 `json:"total"`
	TodayCount     int                 `json:"today_count"`
	ByAction       map[string]int      `json:"by_action"`
	ByResourceType map[string]int      `json:"by_resource_type"`
	ByUser         []UserActivityCount `json:"by_user"`
}

type UserActivityCount struct {
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	Count    int    `json:"count"`
}

func (s *ActivityService) Statistics(ctx context.Context) (*ActivityStats, error) {
	total, err := s.client.Activity.Query().Count(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count activities: " + err.Error())
	}

	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	todayCount, err := s.client.Activity.Query().
		Where(activity.CreatedAtGTE(todayStart)).
		Count(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count today activities: " + err.Error())
	}

	// 按 action 统计
	all, err := s.client.Activity.Query().All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to query activities: " + err.Error())
	}

	byAction := make(map[string]int)
	byResourceType := make(map[string]int)
	userCounts := make(map[int]*UserActivityCount)

	for _, a := range all {
		byAction[a.Action]++
		byResourceType[a.ResourceType]++
		if uc, ok := userCounts[a.UserID]; ok {
			uc.Count++
		} else {
			userCounts[a.UserID] = &UserActivityCount{
				UserID:   a.UserID,
				Username: a.Username,
				Count:    1,
			}
		}
	}

	byUser := make([]UserActivityCount, 0, len(userCounts))
	for _, uc := range userCounts {
		byUser = append(byUser, *uc)
	}

	return &ActivityStats{
		Total:          total,
		TodayCount:     todayCount,
		ByAction:       byAction,
		ByResourceType: byResourceType,
		ByUser:         byUser,
	}, nil
}

func (s *ActivityService) Export(ctx context.Context, q *models.ActivityListQuery) ([]byte, error) {
	query := s.client.Activity.Query()

	if q.ResourceType != "" {
		query = query.Where(activity.ResourceType(q.ResourceType))
	}
	if q.UserID != 0 {
		query = query.Where(activity.UserID(q.UserID))
	}
	if q.Action != "" {
		query = query.Where(activity.ActionContains(q.Action))
	}

	activities, err := query.
		Order(ent.Desc(activity.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to export activities: " + err.Error())
	}

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	_ = w.Write([]string{"时间", "用户", "动作", "资源类型", "资源ID", "详情", "IP", "Method", "Path"})

	for _, a := range activities {
		_ = w.Write([]string{
			a.CreatedAt.Format("2006-01-02 15:04:05"),
			a.Username,
			a.Action,
			a.ResourceType,
			fmt.Sprintf("%d", a.ResourceID),
			a.Detail,
			a.IP,
			a.Method,
			a.Path,
		})
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to write csv: " + err.Error())
	}

	return buf.Bytes(), nil
}

func toActivityResponse(a *ent.Activity) models.ActivityResponse {
	return models.ActivityResponse{
		ID:           a.ID,
		Action:       a.Action,
		ResourceType: a.ResourceType,
		ResourceID:   a.ResourceID,
		UserID:       a.UserID,
		Username:     a.Username,
		Detail:       a.Detail,
		Details:      a.Details,
		IP:           a.IP,
		UserAgent:    a.UserAgent,
		Method:       a.Method,
		Path:         a.Path,
		StatusCode:   a.StatusCode,
		CreatedAt:    a.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
}
