package services

import (
	"context"
	"time"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/announcement"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type AnnouncementService struct {
	client *ent.Client
}

func NewAnnouncementService(client *ent.Client) *AnnouncementService {
	return &AnnouncementService{client: client}
}

func (s *AnnouncementService) GetByID(ctx context.Context, id int) (*ent.Announcement, error) {
	a, err := s.client.Announcement.Get(ctx, id)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("announcement not found")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to get announcement: " + err.Error())
	}
	return a, nil
}

func (s *AnnouncementService) List(ctx context.Context) ([]*ent.Announcement, error) {
	items, err := s.client.Announcement.Query().
		Order(ent.Desc(announcement.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list announcements: " + err.Error())
	}
	return items, nil
}

func (s *AnnouncementService) ListPublished(ctx context.Context) ([]*ent.Announcement, error) {
	now := time.Now()
	items, err := s.client.Announcement.Query().
		Where(
			announcement.Published(true),
			announcement.Or(
				announcement.ExpiresAtIsNil(),
				announcement.ExpiresAtGT(now),
			),
		).
		Order(ent.Desc(announcement.FieldPublishedAt)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list published announcements: " + err.Error())
	}
	return items, nil
}

func (s *AnnouncementService) Create(ctx context.Context, req *models.CreateAnnouncementRequest, userID int) (*ent.Announcement, error) {
	builder := s.client.Announcement.Create().
		SetTitle(req.Title).
		SetContent(req.Content).
		SetCreatedBy(userID)

	if req.Priority != "" {
		builder = builder.SetPriority(announcement.Priority(req.Priority))
	}
	if req.ExpiresAt != nil {
		t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			return nil, apperr.ErrBadRequest.WithMessage("invalid expires_at format, use RFC3339")
		}
		builder = builder.SetExpiresAt(t)
	}

	a, err := builder.Save(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to create announcement: " + err.Error())
	}
	return a, nil
}

func (s *AnnouncementService) Update(ctx context.Context, id int, req *models.UpdateAnnouncementRequest) (*ent.Announcement, error) {
	builder := s.client.Announcement.UpdateOneID(id)

	if req.Title != nil {
		builder = builder.SetTitle(*req.Title)
	}
	if req.Content != nil {
		builder = builder.SetContent(*req.Content)
	}
	if req.Priority != nil {
		builder = builder.SetPriority(announcement.Priority(*req.Priority))
	}
	if req.ExpiresAt != nil {
		if *req.ExpiresAt == "" {
			builder = builder.ClearExpiresAt()
		} else {
			t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
			if err != nil {
				return nil, apperr.ErrBadRequest.WithMessage("invalid expires_at format, use RFC3339")
			}
			builder = builder.SetExpiresAt(t)
		}
	}

	a, err := builder.Save(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("announcement not found")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to update announcement: " + err.Error())
	}
	return a, nil
}

func (s *AnnouncementService) Delete(ctx context.Context, id int) error {
	err := s.client.Announcement.DeleteOneID(id).Exec(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("announcement not found")
		}
		return apperr.ErrInternal.WithMessage("failed to delete announcement: " + err.Error())
	}
	return nil
}

func (s *AnnouncementService) Publish(ctx context.Context, id int) error {
	now := time.Now()
	_, err := s.client.Announcement.UpdateOneID(id).
		SetPublished(true).
		SetPublishedAt(now).
		Save(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("announcement not found")
		}
		return apperr.ErrInternal.WithMessage("failed to publish announcement: " + err.Error())
	}
	return nil
}

func (s *AnnouncementService) Unpublish(ctx context.Context, id int) error {
	_, err := s.client.Announcement.UpdateOneID(id).
		SetPublished(false).
		ClearPublishedAt().
		Save(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("announcement not found")
		}
		return apperr.ErrInternal.WithMessage("failed to unpublish announcement: " + err.Error())
	}
	return nil
}
