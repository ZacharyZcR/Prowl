package services

import (
	"context"
	"math"

	"golang.org/x/crypto/bcrypt"

	"github.com/ZacharyZcR/STC/backend/ent"
	entRole "github.com/ZacharyZcR/STC/backend/ent/role"
	"github.com/ZacharyZcR/STC/backend/ent/user"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type UserService struct {
	client *ent.Client
}

func NewUserService(client *ent.Client) *UserService {
	return &UserService{client: client}
}

func (s *UserService) List(ctx context.Context, q *models.ListQuery) (*models.PaginatedResponse, error) {
	query := s.client.User.Query()

	if q.Search != "" {
		query = query.Where(
			user.Or(
				user.UsernameContains(q.Search),
				user.EmailContains(q.Search),
			),
		)
	}

	total, err := query.Count(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count users: " + err.Error())
	}

	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 || q.PageSize > 100 {
		q.PageSize = 20
	}

	offset := (q.Page - 1) * q.PageSize
	users, err := query.
		WithRole().
		Limit(q.PageSize).
		Offset(offset).
		Order(ent.Desc(user.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list users: " + err.Error())
	}

	items := make([]models.UserResponse, 0, len(users))
	for _, u := range users {
		items = append(items, BuildUserResponse(u))
	}

	return &models.PaginatedResponse{
		Items:      items,
		Total:      total,
		Page:       q.Page,
		PageSize:   q.PageSize,
		TotalPages: int(math.Ceil(float64(total) / float64(q.PageSize))),
	}, nil
}

func (s *UserService) GetByID(ctx context.Context, id int) (*ent.User, error) {
	u, err := s.client.User.Query().Where(user.ID(id)).WithRole().Only(ctx)
	if err != nil {
		return nil, apperr.ErrNotFound.WithMessage("user not found")
	}
	return u, nil
}

func (s *UserService) Create(ctx context.Context, req *models.CreateUserRequest) (*ent.User, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to hash password: " + err.Error())
	}

	builder := s.client.User.Create().
		SetUsername(req.Username).
		SetPassword(string(hashed)).
		SetRoleID(req.RoleID)

	if req.Email != "" {
		builder = builder.SetEmail(req.Email)
	}
	if req.Nickname != "" {
		builder = builder.SetNickname(req.Nickname)
	}

	u, err := builder.Save(ctx)
	if err != nil {
		if ent.IsConstraintError(err) {
			return nil, apperr.ErrBadRequest.WithMessage("username or email already exists")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to create user: " + err.Error())
	}

	return s.GetByID(ctx, u.ID)
}

func (s *UserService) Update(ctx context.Context, id int, req *models.UpdateUserRequest) (*ent.User, error) {
	builder := s.client.User.UpdateOneID(id)

	if req.Email != nil {
		builder = builder.SetEmail(*req.Email)
	}
	if req.Nickname != nil {
		builder = builder.SetNickname(*req.Nickname)
	}
	if req.RoleID != nil {
		builder = builder.SetRoleID(*req.RoleID)
	}

	_, err := builder.Save(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("user not found")
		}
		if ent.IsConstraintError(err) {
			return nil, apperr.ErrBadRequest.WithMessage("email already exists")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to update user: " + err.Error())
	}

	return s.GetByID(ctx, id)
}

func (s *UserService) Delete(ctx context.Context, id int, currentUserID int) error {
	if id == currentUserID {
		return apperr.ErrBadRequest.WithMessage("cannot delete yourself")
	}

	u, err := s.client.User.Query().Where(user.ID(id)).WithRole().Only(ctx)
	if err != nil {
		return apperr.ErrNotFound.WithMessage("user not found")
	}

	if u.Edges.Role != nil && u.Edges.Role.Name == "admin" {
		adminCount, err := s.client.User.Query().
			Where(user.HasRoleWith(entRole.Name("admin"))).
			Count(ctx)
		if err != nil {
			return apperr.ErrInternal.WithMessage("failed to check admin count: " + err.Error())
		}
		if adminCount <= 1 {
			return apperr.ErrBadRequest.WithMessage("cannot delete the last admin user")
		}
	}

	err = s.client.User.DeleteOneID(id).Exec(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to delete user: " + err.Error())
	}
	return nil
}

func (s *UserService) ChangePassword(ctx context.Context, id int, oldPwd, newPwd string) error {
	u, err := s.client.User.Get(ctx, id)
	if err != nil {
		return apperr.ErrNotFound.WithMessage("user not found")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(oldPwd)); err != nil {
		return apperr.ErrBadRequest.WithMessage("old password is incorrect")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(newPwd), bcrypt.DefaultCost)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to hash password: " + err.Error())
	}

	_, err = s.client.User.UpdateOneID(id).SetPassword(string(hashed)).Save(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to update password: " + err.Error())
	}
	return nil
}

func BuildUserResponse(u *ent.User) models.UserResponse {
	resp := models.UserResponse{
		ID:        u.ID,
		Username:  u.Username,
		Email:     u.Email,
		Nickname:  u.Nickname,
		CreatedAt: u.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
	if u.Edges.Role != nil {
		r := u.Edges.Role
		resp.Role = &models.RoleResponse{
			ID:          r.ID,
			Name:        r.Name,
			Description: r.Description,
			Permissions: r.Permissions,
			CreatedAt:   r.CreatedAt.Format("2006-01-02T15:04:05Z"),
		}
	}
	return resp
}
