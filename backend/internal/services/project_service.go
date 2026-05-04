package services

import (
	"context"
	"fmt"
	"math"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/project"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/tx"
)

type ProjectService struct {
	client   *ent.Client
	activity *ActivityService
}

func NewProjectService(client *ent.Client, activity *ActivityService) *ProjectService {
	return &ProjectService{client: client, activity: activity}
}

func (s *ProjectService) List(ctx context.Context, q *models.ProjectListQuery) (*models.PaginatedResponse, error) {
	query := s.client.Project.Query().WithOwner()

	if q.Search != "" {
		query = query.Where(project.NameContains(q.Search))
	}
	if q.Status != "" {
		query = query.Where(project.Status(q.Status))
	}

	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 || q.PageSize > 100 {
		q.PageSize = 20
	}

	total, err := query.Count(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count projects: " + err.Error())
	}

	offset := (q.Page - 1) * q.PageSize
	projects, err := query.
		Limit(q.PageSize).
		Offset(offset).
		Order(ent.Desc(project.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list projects: " + err.Error())
	}

	items := make([]models.ProjectResponse, 0, len(projects))
	for _, p := range projects {
		items = append(items, buildProjectResponse(p, ownerNameFromProject(p)))
	}

	return &models.PaginatedResponse{
		Items:      items,
		Total:      total,
		Page:       q.Page,
		PageSize:   q.PageSize,
		TotalPages: int(math.Ceil(float64(total) / float64(q.PageSize))),
	}, nil
}

func (s *ProjectService) GetByID(ctx context.Context, id int) (*ent.Project, error) {
	p, err := s.client.Project.Get(ctx, id)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("project not found")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to get project: " + err.Error())
	}
	return p, nil
}

func (s *ProjectService) GetByIDWithOwner(ctx context.Context, id int) (*models.ProjectResponse, error) {
	p, err := s.client.Project.Query().
		Where(project.ID(id)).
		WithOwner().
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("project not found")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to get project: " + err.Error())
	}

	resp := buildProjectResponse(p, ownerNameFromProject(p))
	return &resp, nil
}

func (s *ProjectService) Create(ctx context.Context, req *models.CreateProjectRequest, ownerID int, username, ip string) (*ent.Project, error) {
	var result *ent.Project
	err := tx.WithTx(ctx, s.client, func(t *ent.Tx) error {
		builder := t.Project.Create().
			SetName(req.Name).
			SetDescription(req.Description).
			SetOwnerID(ownerID)

		if req.Status != "" {
			builder = builder.SetStatus(req.Status)
		}

		p, err := builder.Save(ctx)
		if err != nil {
			return apperr.ErrInternal.WithMessage("failed to create project: " + err.Error())
		}

		_, err = t.Activity.Create().
			SetUserID(ownerID).
			SetUsername(username).
			SetAction("project.create").
			SetResourceType("project").
			SetResourceID(p.ID).
			SetDetail(fmt.Sprintf("created project: %s", p.Name)).
			SetIP(ip).
			Save(ctx)
		if err != nil {
			return apperr.ErrInternal.WithMessage("failed to log activity: " + err.Error())
		}

		result = p
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *ProjectService) Update(ctx context.Context, id int, req *models.UpdateProjectRequest, userID int, username, ip string) (*ent.Project, error) {
	var result *ent.Project
	err := tx.WithTx(ctx, s.client, func(t *ent.Tx) error {
		builder := t.Project.UpdateOneID(id)

		if req.Name != nil {
			builder = builder.SetName(*req.Name)
		}
		if req.Description != nil {
			builder = builder.SetDescription(*req.Description)
		}
		if req.Status != nil {
			builder = builder.SetStatus(*req.Status)
		}

		p, err := builder.Save(ctx)
		if err != nil {
			if ent.IsNotFound(err) {
				return apperr.ErrNotFound.WithMessage("project not found")
			}
			return apperr.ErrInternal.WithMessage("failed to update project: " + err.Error())
		}

		_, err = t.Activity.Create().
			SetUserID(userID).
			SetUsername(username).
			SetAction("project.update").
			SetResourceType("project").
			SetResourceID(p.ID).
			SetDetail(fmt.Sprintf("updated project: %s", p.Name)).
			SetIP(ip).
			Save(ctx)
		if err != nil {
			return apperr.ErrInternal.WithMessage("failed to log activity: " + err.Error())
		}

		result = p
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *ProjectService) Delete(ctx context.Context, id int, userID int, username, ip string) error {
	p, err := s.client.Project.Get(ctx, id)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("project not found")
		}
		return apperr.ErrInternal.WithMessage("failed to get project: " + err.Error())
	}

	return tx.WithTx(ctx, s.client, func(t *ent.Tx) error {
		if err := t.Project.DeleteOneID(id).Exec(ctx); err != nil {
			return apperr.ErrInternal.WithMessage("failed to delete project: " + err.Error())
		}

		_, err := t.Activity.Create().
			SetUserID(userID).
			SetUsername(username).
			SetAction("project.delete").
			SetResourceType("project").
			SetResourceID(id).
			SetDetail(fmt.Sprintf("deleted project: %s", p.Name)).
			SetIP(ip).
			Save(ctx)
		if err != nil {
			return apperr.ErrInternal.WithMessage("failed to log activity: " + err.Error())
		}

		return nil
	})
}

func (s *ProjectService) BatchDelete(ctx context.Context, ids []int, userID int, username, ip string) (int, []string, error) {
	ids = uniqueInts(ids)
	if len(ids) == 0 {
		return 0, nil, apperr.ErrBadRequest.WithMessage("no valid project ids provided")
	}

	projects, err := s.client.Project.Query().Where(project.IDIn(ids...)).All(ctx)
	if err != nil {
		return 0, nil, apperr.ErrInternal.WithMessage("failed to load projects: " + err.Error())
	}

	if len(projects) == 0 {
		return 0, missingProjectErrors(ids, nil), nil
	}

	found := make(map[int]*ent.Project, len(projects))
	foundIDs := make([]int, 0, len(projects))
	for _, p := range projects {
		found[p.ID] = p
		foundIDs = append(foundIDs, p.ID)
	}

	var deleted int
	err = tx.WithTx(ctx, s.client, func(t *ent.Tx) error {
		var deleteErr error
		deleted, deleteErr = t.Project.Delete().Where(project.IDIn(foundIDs...)).Exec(ctx)
		if deleteErr != nil {
			return apperr.ErrInternal.WithMessage("failed to delete projects: " + err.Error())
		}

		builders := make([]*ent.ActivityCreate, 0, len(projects))
		for _, p := range projects {
			builders = append(builders, t.Activity.Create().
				SetUserID(userID).
				SetUsername(username).
				SetAction("project.delete").
				SetResourceType("project").
				SetResourceID(p.ID).
				SetDetail(fmt.Sprintf("deleted project: %s", p.Name)).
				SetIP(ip))
		}
		if len(builders) == 0 {
			return nil
		}
		if _, activityErr := t.Activity.CreateBulk(builders...).Save(ctx); activityErr != nil {
			return apperr.ErrInternal.WithMessage("failed to log activity: " + err.Error())
		}
		return nil
	})
	if err != nil {
		return 0, nil, err
	}

	return deleted, missingProjectErrors(ids, found), nil
}

func buildProjectResponse(p *ent.Project, ownerName string) models.ProjectResponse {
	return models.ProjectResponse{
		ID:          p.ID,
		Name:        p.Name,
		Description: p.Description,
		Status:      p.Status,
		OwnerID:     p.OwnerID,
		OwnerName:   ownerName,
		CreatedAt:   p.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:   p.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}
}

func ownerNameFromProject(p *ent.Project) string {
	if p.Edges.Owner != nil {
		return p.Edges.Owner.Username
	}
	return ""
}

func uniqueInts(ids []int) []int {
	seen := make(map[int]struct{}, len(ids))
	unique := make([]int, 0, len(ids))
	for _, id := range ids {
		if id <= 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		unique = append(unique, id)
	}
	return unique
}

func missingProjectErrors(ids []int, found map[int]*ent.Project) []string {
	errs := make([]string, 0)
	for _, id := range ids {
		if found != nil {
			if _, ok := found[id]; ok {
				continue
			}
		}
		errs = append(errs, fmt.Sprintf("project %d not found", id))
	}
	return errs
}
