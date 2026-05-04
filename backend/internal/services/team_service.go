package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math"
	"time"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/competition"
	"github.com/ZacharyZcR/STC/backend/ent/team"
	"github.com/ZacharyZcR/STC/backend/ent/teammember"
	"github.com/ZacharyZcR/STC/backend/ent/teamregistration"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/tx"
)

type TeamService struct {
	client   *ent.Client
	activity *ActivityService
}

func NewTeamService(client *ent.Client, activity *ActivityService) *TeamService {
	return &TeamService{client: client, activity: activity}
}

func (s *TeamService) List(ctx context.Context, q *models.TeamListQuery) (*models.PaginatedResponse, error) {
	query := s.client.Team.Query().WithCaptain().WithMembers()

	if q.Search != "" {
		query = query.Where(team.NameContains(q.Search))
	}

	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 || q.PageSize > 100 {
		q.PageSize = 20
	}

	total, err := query.Count(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count teams: " + err.Error())
	}

	offset := (q.Page - 1) * q.PageSize
	teams, err := query.
		Limit(q.PageSize).
		Offset(offset).
		Order(ent.Desc(team.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list teams: " + err.Error())
	}

	items := make([]models.TeamResponse, 0, len(teams))
	for _, t := range teams {
		items = append(items, buildTeamResponse(t, true))
	}

	return &models.PaginatedResponse{
		Items:      items,
		Total:      total,
		Page:       q.Page,
		PageSize:   q.PageSize,
		TotalPages: int(math.Ceil(float64(total) / float64(q.PageSize))),
	}, nil
}

func (s *TeamService) GetByID(ctx context.Context, id int) (*models.TeamResponse, error) {
	t, err := s.client.Team.Query().
		Where(team.ID(id)).
		WithCaptain().
		WithMembers(func(q *ent.TeamMemberQuery) {
			q.WithUser()
		}).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("team not found")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to get team: " + err.Error())
	}

	resp := buildTeamResponse(t, true)
	return &resp, nil
}

func (s *TeamService) GetByUserID(ctx context.Context, userID int) (*models.TeamResponse, error) {
	member, err := s.client.TeamMember.Query().
		Where(teammember.UserID(userID)).
		WithTeam(func(q *ent.TeamQuery) {
			q.WithCaptain()
			q.WithMembers(func(mq *ent.TeamMemberQuery) {
				mq.WithUser()
			})
		}).
		First(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("you are not in any team")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to get team: " + err.Error())
	}

	if member.Edges.Team == nil {
		return nil, apperr.ErrNotFound.WithMessage("team not found")
	}

	resp := buildTeamResponse(member.Edges.Team, true)
	return &resp, nil
}

func (s *TeamService) Create(ctx context.Context, req *models.CreateTeamRequest, userID int, username, ip string) (*ent.Team, error) {
	exists, _ := s.client.TeamMember.Query().Where(teammember.UserID(userID)).Exist(ctx)
	if exists {
		return nil, apperr.ErrBadRequest.WithMessage("you are already in a team")
	}

	inviteCode, err := generateInviteCode()
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to generate invite code: " + err.Error())
	}

	var result *ent.Team
	err = tx.WithTx(ctx, s.client, func(t *ent.Tx) error {
		tm, err := t.Team.Create().
			SetName(req.Name).
			SetDescription(req.Description).
			SetInviteCode(inviteCode).
			SetCaptainID(userID).
			Save(ctx)
		if err != nil {
			return apperr.ErrInternal.WithMessage("failed to create team: " + err.Error())
		}

		_, err = t.TeamMember.Create().
			SetTeamID(tm.ID).
			SetUserID(userID).
			SetRole(teammember.RoleCaptain).
			Save(ctx)
		if err != nil {
			return apperr.ErrInternal.WithMessage("failed to add captain as member: " + err.Error())
		}

		_, err = t.Activity.Create().
			SetUserID(userID).
			SetUsername(username).
			SetAction("team.create").
			SetResourceType("team").
			SetResourceID(tm.ID).
			SetDetail(fmt.Sprintf("created team: %s", tm.Name)).
			SetIP(ip).
			Save(ctx)
		if err != nil {
			return apperr.ErrInternal.WithMessage("failed to log activity: " + err.Error())
		}

		result = tm
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *TeamService) Update(ctx context.Context, id int, req *models.UpdateTeamRequest, userID int) (*ent.Team, error) {
	t, err := s.client.Team.Get(ctx, id)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("team not found")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to get team: " + err.Error())
	}

	if t.CaptainID != userID {
		return nil, apperr.ErrForbidden.WithMessage("only the captain can update the team")
	}

	builder := s.client.Team.UpdateOneID(id)
	if req.Name != nil {
		builder = builder.SetName(*req.Name)
	}
	if req.Description != nil {
		builder = builder.SetDescription(*req.Description)
	}
	if req.AvatarURL != nil {
		builder = builder.SetAvatarURL(*req.AvatarURL)
	}

	updated, err := builder.Save(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to update team: " + err.Error())
	}
	return updated, nil
}

func (s *TeamService) Join(ctx context.Context, inviteCode string, userID int) error {
	exists, _ := s.client.TeamMember.Query().Where(teammember.UserID(userID)).Exist(ctx)
	if exists {
		return apperr.ErrBadRequest.WithMessage("you are already in a team")
	}

	t, err := s.client.Team.Query().Where(team.InviteCode(inviteCode)).Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("invalid invite code")
		}
		return apperr.ErrInternal.WithMessage("failed to find team: " + err.Error())
	}

	if !t.IsActive {
		return apperr.ErrBadRequest.WithMessage("team is not active")
	}

	_, err = s.client.TeamMember.Create().
		SetTeamID(t.ID).
		SetUserID(userID).
		SetRole(teammember.RoleMember).
		Save(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to join team: " + err.Error())
	}
	return nil
}

func (s *TeamService) Leave(ctx context.Context, userID int) error {
	member, err := s.client.TeamMember.Query().
		Where(teammember.UserID(userID)).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("you are not in any team")
		}
		return apperr.ErrInternal.WithMessage("failed to find membership: " + err.Error())
	}

	if member.Role == teammember.RoleCaptain {
		return s.Disband(ctx, member.TeamID)
	}

	return s.client.TeamMember.DeleteOneID(member.ID).Exec(ctx)
}

func (s *TeamService) Disband(ctx context.Context, teamID int) error {
	return tx.WithTx(ctx, s.client, func(t *ent.Tx) error {
		if _, err := t.TeamMember.Delete().Where(teammember.TeamID(teamID)).Exec(ctx); err != nil {
			return apperr.ErrInternal.WithMessage("failed to remove members: " + err.Error())
		}
		if _, err := t.TeamRegistration.Delete().Where(teamregistration.TeamID(teamID)).Exec(ctx); err != nil {
			return apperr.ErrInternal.WithMessage("failed to remove registrations: " + err.Error())
		}
		if err := t.Team.DeleteOneID(teamID).Exec(ctx); err != nil {
			return apperr.ErrInternal.WithMessage("failed to delete team: " + err.Error())
		}
		return nil
	})
}

func (s *TeamService) KickMember(ctx context.Context, teamID, targetUserID, captainID int) error {
	t, err := s.client.Team.Get(ctx, teamID)
	if err != nil {
		return apperr.ErrNotFound.WithMessage("team not found")
	}
	if t.CaptainID != captainID {
		return apperr.ErrForbidden.WithMessage("only captain can kick members")
	}
	if targetUserID == captainID {
		return apperr.ErrBadRequest.WithMessage("captain cannot kick themselves")
	}

	_, err = s.client.TeamMember.Delete().
		Where(teammember.TeamID(teamID), teammember.UserID(targetUserID)).
		Exec(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to kick member: " + err.Error())
	}
	return nil
}

func (s *TeamService) Delete(ctx context.Context, id int) error {
	return tx.WithTx(ctx, s.client, func(t *ent.Tx) error {
		if _, err := t.TeamMember.Delete().Where(teammember.TeamID(id)).Exec(ctx); err != nil {
			return apperr.ErrInternal.WithMessage("failed to delete team members: " + err.Error())
		}
		if _, err := t.TeamRegistration.Delete().Where(teamregistration.TeamID(id)).Exec(ctx); err != nil {
			return apperr.ErrInternal.WithMessage("failed to delete team registrations: " + err.Error())
		}
		if err := t.Team.DeleteOneID(id).Exec(ctx); err != nil {
			return apperr.ErrInternal.WithMessage("failed to delete team: " + err.Error())
		}
		return nil
	})
}

func (s *TeamService) RegisterForCompetition(ctx context.Context, teamID, competitionID int) error {
	exists, _ := s.client.TeamRegistration.Query().
		Where(teamregistration.TeamID(teamID), teamregistration.CompetitionID(competitionID)).
		Exist(ctx)
	if exists {
		return apperr.ErrBadRequest.WithMessage("team already registered")
	}

	comp, err := s.client.Competition.Get(ctx, competitionID)
	if err != nil {
		return apperr.ErrNotFound.WithMessage("competition not found")
	}

	if comp.Status != competition.StatusRegistration && comp.Status != competition.StatusRunning {
		return apperr.ErrBadRequest.WithMessage("competition is not open for registration")
	}

	now := time.Now()
	if comp.RegistrationEnd != nil && now.After(*comp.RegistrationEnd) {
		return apperr.ErrBadRequest.WithMessage("registration deadline has passed")
	}

	builder := s.client.TeamRegistration.Create().
		SetTeamID(teamID).
		SetCompetitionID(competitionID)

	if comp.IsPublic && comp.Password == "" {
		builder = builder.SetStatus(teamregistration.StatusApproved)
	}

	_, err = builder.Save(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to register: " + err.Error())
	}
	return nil
}

func (s *TeamService) GetTeamCompetitions(ctx context.Context, teamID int) ([]models.TeamCompetitionEntry, error) {
	regs, err := s.client.TeamRegistration.Query().
		Where(teamregistration.TeamID(teamID)).
		WithCompetition().
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to query registrations: " + err.Error())
	}
	items := make([]models.TeamCompetitionEntry, 0, len(regs))
	for _, r := range regs {
		if r.Edges.Competition == nil {
			continue
		}
		c := r.Edges.Competition
		entry := models.TeamCompetitionEntry{
			CompetitionID: c.ID,
			Title:         c.Title,
			Mode:          string(c.Mode),
			Status:        string(c.Status),
			TeamRole:      string(r.TeamRole),
			RegStatus:     string(r.Status),
			RegisteredAt:  r.RegisteredAt.Format("2006-01-02T15:04:05Z"),
		}
		if c.StartTime != nil {
			t := c.StartTime.Format("2006-01-02T15:04:05Z")
			entry.StartTime = t
		}
		if c.EndTime != nil {
			t := c.EndTime.Format("2006-01-02T15:04:05Z")
			entry.EndTime = t
		}
		items = append(items, entry)
	}
	return items, nil
}

func buildTeamResponse(t *ent.Team, showInviteCode bool) models.TeamResponse {
	resp := models.TeamResponse{
		ID:          t.ID,
		Name:        t.Name,
		Description: t.Description,
		AvatarURL:   t.AvatarURL,
		CaptainID:   t.CaptainID,
		IsActive:    t.IsActive,
		CreatedAt:   t.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:   t.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}

	if showInviteCode {
		resp.InviteCode = t.InviteCode
	}

	if t.Edges.Captain != nil {
		resp.CaptainName = t.Edges.Captain.Username
	}

	if t.Edges.Members != nil {
		resp.Members = make([]models.TeamMemberResponse, 0, len(t.Edges.Members))
		for _, m := range t.Edges.Members {
			member := models.TeamMemberResponse{
				ID:       m.ID,
				UserID:   m.UserID,
				Role:     string(m.Role),
				JoinedAt: m.JoinedAt.Format("2006-01-02T15:04:05Z"),
			}
			if m.Edges.User != nil {
				member.Username = m.Edges.User.Username
			}
			resp.Members = append(resp.Members, member)
		}
	}

	return resp
}

func generateInviteCode() (string, error) {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
