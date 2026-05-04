package services

import (
	"context"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/permission"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type PermissionService struct {
	client *ent.Client
}

func NewPermissionService(client *ent.Client) *PermissionService {
	return &PermissionService{client: client}
}

func (s *PermissionService) List(ctx context.Context) ([]*ent.Permission, error) {
	perms, err := s.client.Permission.Query().
		Order(ent.Asc(permission.FieldCategory), ent.Asc(permission.FieldCode)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list permissions: " + err.Error())
	}
	return perms, nil
}

func (s *PermissionService) ListByCategory(ctx context.Context) ([]models.PermissionCategoryResponse, error) {
	perms, err := s.List(ctx)
	if err != nil {
		return nil, err
	}

	catMap := make(map[string][]models.PermissionResponse)
	var catOrder []string

	for _, p := range perms {
		if _, seen := catMap[p.Category]; !seen {
			catOrder = append(catOrder, p.Category)
		}
		catMap[p.Category] = append(catMap[p.Category], models.PermissionResponse{
			ID:          p.ID,
			Code:        p.Code,
			Name:        p.Name,
			Resource:    p.Resource,
			Action:      p.Action,
			Scope:       p.Scope,
			Description: p.Description,
			Category:    p.Category,
		})
	}

	result := make([]models.PermissionCategoryResponse, 0, len(catOrder))
	for _, cat := range catOrder {
		result = append(result, models.PermissionCategoryResponse{
			Category:    cat,
			Permissions: catMap[cat],
		})
	}
	return result, nil
}
