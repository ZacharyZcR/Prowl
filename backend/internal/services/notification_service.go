package services

import (
	"context"
	"fmt"
	"time"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/notification"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/server"
)

type NotificationService struct {
	client     *ent.Client
	hub        *server.Hub
	sse        *server.SSEBroker
	dispatcher *NotificationDispatcher
}

func NewNotificationService(client *ent.Client, hub *server.Hub, sse *server.SSEBroker, dispatcher *NotificationDispatcher) *NotificationService {
	return &NotificationService{client: client, hub: hub, sse: sse, dispatcher: dispatcher}
}

func (s *NotificationService) Create(ctx context.Context, userID int, title, content, ntype string) error {
	if ntype == "" {
		ntype = "info"
	}

	n, err := s.client.Notification.Create().
		SetTitle(title).
		SetContent(content).
		SetType(ntype).
		SetUserID(userID).
		Save(ctx)
	if err != nil {
		return err
	}

	resp := buildNotificationResponse(n)

	msg := &server.Message{
		ID:        fmt.Sprintf("notif-%d", n.ID),
		Type:      "notification",
		Payload:   resp,
		Timestamp: time.Now().Unix(),
	}
	s.hub.SendToUser(userID, msg)

	s.sse.SendToUser(userID, server.SSEEvent{
		Event: "notification",
		Data:  resp,
		ID:    fmt.Sprintf("notif-%d", n.ID),
	})

	// 外部通知分发（邮件、Webhook 等）
	if s.dispatcher != nil {
		u, _ := s.client.User.Get(ctx, userID)
		if u != nil && u.Email != "" {
			s.dispatcher.Dispatch(ctx, u.Email, title, content)
		}
	}

	return nil
}

func (s *NotificationService) List(ctx context.Context, userID int, page, pageSize int, unreadOnly bool) (*models.PaginatedResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}

	query := s.client.Notification.Query().Where(notification.UserID(userID))
	if unreadOnly {
		query = query.Where(notification.Read(false))
	}

	total, err := query.Count(ctx)
	if err != nil {
		return nil, err
	}

	items, err := query.
		Order(ent.Desc(notification.FieldCreatedAt)).
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		All(ctx)
	if err != nil {
		return nil, err
	}

	var list []models.NotificationResponse
	for _, n := range items {
		list = append(list, buildNotificationResponse(n))
	}

	totalPages := (total + pageSize - 1) / pageSize
	return &models.PaginatedResponse{
		Items:      list,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

func (s *NotificationService) MarkRead(ctx context.Context, id, userID int) error {
	return s.client.Notification.UpdateOneID(id).
		Where(notification.UserID(userID)).
		SetRead(true).
		Exec(ctx)
}

func (s *NotificationService) MarkAllRead(ctx context.Context, userID int) error {
	_, err := s.client.Notification.Update().
		Where(notification.UserID(userID), notification.Read(false)).
		SetRead(true).
		Save(ctx)
	return err
}

func (s *NotificationService) UnreadCount(ctx context.Context, userID int) (int, error) {
	return s.client.Notification.Query().
		Where(notification.UserID(userID), notification.Read(false)).
		Count(ctx)
}

func buildNotificationResponse(n *ent.Notification) models.NotificationResponse {
	return models.NotificationResponse{
		ID:        n.ID,
		Title:     n.Title,
		Content:   n.Content,
		Type:      n.Type,
		Read:      n.Read,
		CreatedAt: n.CreatedAt.Format(time.RFC3339),
	}
}
