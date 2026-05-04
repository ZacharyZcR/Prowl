package services

import (
	"context"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/dict"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type DictService struct {
	client *ent.Client
}

func NewDictService(client *ent.Client) *DictService {
	return &DictService{client: client}
}

func (s *DictService) ListAll(ctx context.Context) ([]*ent.Dict, error) {
	items, err := s.client.Dict.Query().
		Order(ent.Asc(dict.FieldGroupName), ent.Asc(dict.FieldSortOrder)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list all dict items: " + err.Error())
	}
	return items, nil
}

func (s *DictService) Toggle(ctx context.Context, id int) error {
	d, err := s.client.Dict.Get(ctx, id)
	if err != nil {
		return apperr.ErrNotFound.WithMessage("dict item not found")
	}
	_, err = s.client.Dict.UpdateOneID(id).SetEnabled(!d.Enabled).Save(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to toggle dict item: " + err.Error())
	}
	return nil
}

func (s *DictService) ListGroups(ctx context.Context) ([]string, error) {
	var groups []string
	err := s.client.Dict.Query().
		Select(dict.FieldGroupName).
		GroupBy(dict.FieldGroupName).
		Scan(ctx, &groups)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list dict groups: " + err.Error())
	}
	return groups, nil
}

func (s *DictService) ListByGroup(ctx context.Context, groupName string) ([]*ent.Dict, error) {
	items, err := s.client.Dict.Query().
		Where(dict.GroupName(groupName)).
		Order(ent.Asc(dict.FieldSortOrder)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list dict items: " + err.Error())
	}
	return items, nil
}

func (s *DictService) Create(ctx context.Context, req *models.CreateDictRequest) (*ent.Dict, error) {
	builder := s.client.Dict.Create().
		SetGroupName(req.GroupName).
		SetKey(req.Key).
		SetLabel(req.Label).
		SetValue(req.Value).
		SetSortOrder(req.SortOrder)

	if req.Enabled != nil {
		builder = builder.SetEnabled(*req.Enabled)
	}

	d, err := builder.Save(ctx)
	if err != nil {
		if ent.IsConstraintError(err) {
			return nil, apperr.ErrBadRequest.WithMessage("dict item with same group_name and key already exists")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to create dict item: " + err.Error())
	}
	return d, nil
}

func (s *DictService) Update(ctx context.Context, id int, req *models.UpdateDictRequest) (*ent.Dict, error) {
	builder := s.client.Dict.UpdateOneID(id)

	if req.GroupName != nil {
		builder = builder.SetGroupName(*req.GroupName)
	}
	if req.Key != nil {
		builder = builder.SetKey(*req.Key)
	}
	if req.Label != nil {
		builder = builder.SetLabel(*req.Label)
	}
	if req.Value != nil {
		builder = builder.SetValue(*req.Value)
	}
	if req.SortOrder != nil {
		builder = builder.SetSortOrder(*req.SortOrder)
	}
	if req.Enabled != nil {
		builder = builder.SetEnabled(*req.Enabled)
	}

	d, err := builder.Save(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("dict item not found")
		}
		if ent.IsConstraintError(err) {
			return nil, apperr.ErrBadRequest.WithMessage("dict item with same group_name and key already exists")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to update dict item: " + err.Error())
	}
	return d, nil
}

func (s *DictService) Delete(ctx context.Context, id int) error {
	err := s.client.Dict.DeleteOneID(id).Exec(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("dict item not found")
		}
		return apperr.ErrInternal.WithMessage("failed to delete dict item: " + err.Error())
	}
	return nil
}
