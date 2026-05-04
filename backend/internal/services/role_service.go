package services

import (
	"context"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/role"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type RoleService struct {
	client *ent.Client
}

func NewRoleService(client *ent.Client) *RoleService {
	return &RoleService{client: client}
}

func (s *RoleService) List(ctx context.Context) ([]*ent.Role, error) {
	roles, err := s.client.Role.Query().WithUsers().Order(ent.Asc(role.FieldID)).All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list roles: " + err.Error())
	}
	return roles, nil
}

func (s *RoleService) GetByID(ctx context.Context, id int) (*ent.Role, error) {
	r, err := s.client.Role.Query().Where(role.ID(id)).WithUsers().Only(ctx)
	if err != nil {
		return nil, apperr.ErrNotFound.WithMessage("role not found")
	}
	return r, nil
}

func (s *RoleService) Create(ctx context.Context, req *models.CreateRoleRequest) (*ent.Role, error) {
	r, err := s.client.Role.Create().
		SetName(req.Name).
		SetDescription(req.Description).
		SetPermissions(req.Permissions).
		Save(ctx)
	if err != nil {
		if ent.IsConstraintError(err) {
			return nil, apperr.ErrBadRequest.WithMessage("role name already exists")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to create role: " + err.Error())
	}
	return r, nil
}

func (s *RoleService) Update(ctx context.Context, id int, req *models.UpdateRoleRequest) (*ent.Role, error) {
	builder := s.client.Role.UpdateOneID(id)

	if req.Name != nil {
		builder = builder.SetName(*req.Name)
	}
	if req.Description != nil {
		builder = builder.SetDescription(*req.Description)
	}
	if req.Permissions != nil {
		builder = builder.SetPermissions(*req.Permissions)
	}

	r, err := builder.Save(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("role not found")
		}
		if ent.IsConstraintError(err) {
			return nil, apperr.ErrBadRequest.WithMessage("role name already exists")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to update role: " + err.Error())
	}
	return r, nil
}

func (s *RoleService) Delete(ctx context.Context, id int) error {
	r, err := s.client.Role.Query().Where(role.ID(id)).WithUsers().Only(ctx)
	if err != nil {
		return apperr.ErrNotFound.WithMessage("role not found")
	}

	if len(r.Edges.Users) > 0 {
		return apperr.ErrBadRequest.WithMessage("cannot delete role with assigned users")
	}

	err = s.client.Role.DeleteOneID(id).Exec(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to delete role: " + err.Error())
	}
	return nil
}
