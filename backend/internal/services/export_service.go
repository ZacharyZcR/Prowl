package services

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"strings"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/user"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type ExportService struct {
	client *ent.Client
}

func NewExportService(client *ent.Client) *ExportService {
	return &ExportService{client: client}
}

type ProgressFunc func(current, total int)

func (s *ExportService) ExportUsers(ctx context.Context) ([]byte, error) {
	return s.ExportUsersWithProgress(ctx, nil)
}

func (s *ExportService) ExportUsersWithProgress(ctx context.Context, onProgress ProgressFunc) ([]byte, error) {
	users, err := s.client.User.Query().WithRole().Order(ent.Asc(user.FieldID)).All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to query users: " + err.Error())
	}

	total := len(users)
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	_ = w.Write([]string{"ID", "Username", "Email", "Nickname", "Role", "CreatedAt"})

	for i, u := range users {
		roleName := ""
		if u.Edges.Role != nil {
			roleName = u.Edges.Role.Name
		}
		_ = w.Write([]string{
			fmt.Sprintf("%d", u.ID),
			u.Username,
			u.Email,
			u.Nickname,
			roleName,
			u.CreatedAt.Format("2006-01-02 15:04:05"),
		})
		if onProgress != nil && (i%50 == 0 || i == total-1) {
			onProgress(i+1, total)
		}
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to write csv: " + err.Error())
	}
	return buf.Bytes(), nil
}

func (s *ExportService) ExportProjects(ctx context.Context) ([]byte, error) {
	return s.ExportProjectsWithProgress(ctx, nil)
}

func (s *ExportService) ExportProjectsWithProgress(ctx context.Context, onProgress ProgressFunc) ([]byte, error) {
	projects, err := s.client.Project.Query().All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to query projects: " + err.Error())
	}

	ownerIDs := make([]int, 0, len(projects))
	for _, p := range projects {
		ownerIDs = append(ownerIDs, p.OwnerID)
	}
	ownerMap := make(map[int]string)
	if len(ownerIDs) > 0 {
		owners, _ := s.client.User.Query().Where(user.IDIn(ownerIDs...)).All(ctx)
		for _, u := range owners {
			ownerMap[u.ID] = u.Username
		}
	}

	total := len(projects)
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	_ = w.Write([]string{"ID", "Name", "Description", "Status", "Owner", "CreatedAt"})

	for i, p := range projects {
		_ = w.Write([]string{
			fmt.Sprintf("%d", p.ID),
			p.Name,
			p.Description,
			p.Status,
			ownerMap[p.OwnerID],
			p.CreatedAt.Format("2006-01-02 15:04:05"),
		})
		if onProgress != nil && (i%50 == 0 || i == total-1) {
			onProgress(i+1, total)
		}
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to write csv: " + err.Error())
	}
	return buf.Bytes(), nil
}

func (s *ExportService) ExportRoles(ctx context.Context) ([]byte, error) {
	return s.ExportRolesWithProgress(ctx, nil)
}

func (s *ExportService) ExportRolesWithProgress(ctx context.Context, onProgress ProgressFunc) ([]byte, error) {
	roles, err := s.client.Role.Query().All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to query roles: " + err.Error())
	}

	total := len(roles)
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	_ = w.Write([]string{"ID", "Name", "Description", "Permissions", "CreatedAt"})

	for i, r := range roles {
		_ = w.Write([]string{
			fmt.Sprintf("%d", r.ID),
			r.Name,
			r.Description,
			strings.Join(r.Permissions, ";"),
			r.CreatedAt.Format("2006-01-02 15:04:05"),
		})
		if onProgress != nil && (i%50 == 0 || i == total-1) {
			onProgress(i+1, total)
		}
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to write csv: " + err.Error())
	}
	return buf.Bytes(), nil
}
