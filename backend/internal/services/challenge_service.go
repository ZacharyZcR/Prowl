package services

import (
	"context"
	"encoding/json"
	"fmt"
	"math"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/challenge"
	"github.com/ZacharyZcR/STC/backend/ent/challengehint"
	"github.com/ZacharyZcR/STC/backend/ent/challengetag"
	"github.com/ZacharyZcR/STC/backend/ent/competitionchallenge"
	"github.com/ZacharyZcR/STC/backend/ent/flagsubmission"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/tx"
)

type ChallengeService struct {
	client   *ent.Client
	activity *ActivityService
}

func NewChallengeService(client *ent.Client, activity *ActivityService) *ChallengeService {
	return &ChallengeService{client: client, activity: activity}
}

func (s *ChallengeService) List(ctx context.Context, q *models.ChallengeListQuery) (*models.PaginatedResponse, error) {
	query := s.client.Challenge.Query().WithAuthor().WithTags().WithHints()

	if q.Search != "" {
		query = query.Where(challenge.TitleContains(q.Search))
	}
	if q.Category != "" {
		query = query.Where(challenge.Category(q.Category))
	}
	if q.Difficulty != "" {
		query = query.Where(challenge.DifficultyEQ(challenge.Difficulty(q.Difficulty)))
	}
	if q.IsHidden != nil {
		query = query.Where(challenge.IsHidden(*q.IsHidden))
	}
	if q.IsDynamic != nil {
		query = query.Where(challenge.IsDynamic(*q.IsDynamic))
	}
	if q.Mode != "" {
		query = query.Where(challenge.ModeEQ(challenge.Mode(q.Mode)))
	}

	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 || q.PageSize > 100 {
		q.PageSize = 20
	}

	total, err := query.Count(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count challenges: " + err.Error())
	}

	offset := (q.Page - 1) * q.PageSize
	challenges, err := query.
		Limit(q.PageSize).
		Offset(offset).
		Order(ent.Desc(challenge.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list challenges: " + err.Error())
	}

	items := make([]models.ChallengeResponse, 0, len(challenges))
	for _, c := range challenges {
		items = append(items, buildChallengeResponse(c))
	}

	return &models.PaginatedResponse{
		Items:      items,
		Total:      total,
		Page:       q.Page,
		PageSize:   q.PageSize,
		TotalPages: int(math.Ceil(float64(total) / float64(q.PageSize))),
	}, nil
}

func (s *ChallengeService) GetByID(ctx context.Context, id int) (*models.ChallengeResponse, error) {
	c, err := s.client.Challenge.Query().
		Where(challenge.ID(id)).
		WithAuthor().
		WithTags().
		WithHints(func(q *ent.ChallengeHintQuery) {
			q.Order(ent.Asc(challengehint.FieldOrderNum))
		}).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("challenge not found")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to get challenge: " + err.Error())
	}

	resp := buildChallengeResponse(c)
	return &resp, nil
}

func (s *ChallengeService) Create(ctx context.Context, req *models.CreateChallengeRequest, authorID int, username, ip string) (*ent.Challenge, error) {
	networkTopology, err := normalizeNetworkTopology(req.NetworkTopology)
	if err != nil {
		return nil, apperr.ErrBadRequest.WithMessage(err.Error())
	}

	var result *ent.Challenge
	err = tx.WithTx(ctx, s.client, func(t *ent.Tx) error {
		mode := challenge.ModeCtfJeopardy
		if req.Mode != "" {
			mode = challenge.Mode(req.Mode)
		}
		builder := t.Challenge.Create().
			SetTitle(req.Title).
			SetDescription(req.Description).
			SetMode(mode).
			SetCategory(req.Category).
			SetDifficulty(challenge.Difficulty(req.Difficulty)).
			SetFlagType(challenge.FlagType(req.FlagType)).
			SetAuthorID(authorID).
			SetIsDynamic(req.IsDynamic).
			SetIsHidden(req.IsHidden)

		if req.BaseScore > 0 {
			builder = builder.SetBaseScore(req.BaseScore)
		}
		if req.MinScore > 0 {
			builder = builder.SetMinScore(req.MinScore)
		}
		if req.DecayFactor > 0 {
			builder = builder.SetDecayFactor(req.DecayFactor)
		}
		if req.StaticFlag != "" {
			builder = builder.SetStaticFlag(req.StaticFlag)
		}
		if req.FlagTemplate != "" {
			builder = builder.SetFlagTemplate(req.FlagTemplate)
		}
		if req.FlagRegex != "" {
			builder = builder.SetFlagRegex(req.FlagRegex)
		}
		if req.DockerImage != "" {
			builder = builder.SetDockerImage(req.DockerImage)
		}
		if req.DockerCompose != "" {
			builder = builder.SetDockerCompose(req.DockerCompose)
		}
		if networkTopology != nil {
			builder = builder.SetNetworkTopology(networkTopology)
		}
		if req.ExposedPorts != nil {
			builder = builder.SetExposedPorts(req.ExposedPorts)
		}
		if req.EnvVars != nil {
			builder = builder.SetEnvVars(req.EnvVars)
		}
		if req.ResourceLimits != nil {
			builder = builder.SetResourceLimits(req.ResourceLimits)
		}
		if req.MaxContainerDuration > 0 {
			builder = builder.SetMaxContainerDuration(req.MaxContainerDuration)
		}
		if req.HintCost > 0 {
			builder = builder.SetHintCost(req.HintCost)
		}
		if req.AttachmentIDs != nil {
			builder = builder.SetAttachmentIds(req.AttachmentIDs)
		}

		c, err := builder.Save(ctx)
		if err != nil {
			return apperr.ErrInternal.WithMessage("failed to create challenge: " + err.Error())
		}

		if len(req.Tags) > 0 {
			for _, tagName := range req.Tags {
				tag, err := t.ChallengeTag.Query().Where(challengetag.Name(tagName)).Only(ctx)
				if ent.IsNotFound(err) {
					tag, err = t.ChallengeTag.Create().SetName(tagName).Save(ctx)
				}
				if err != nil {
					return apperr.ErrInternal.WithMessage("failed to create tag: " + err.Error())
				}
				if _, err := t.Challenge.UpdateOneID(c.ID).AddTagIDs(tag.ID).Save(ctx); err != nil {
					return apperr.ErrInternal.WithMessage("failed to attach tag: " + err.Error())
				}
			}
		}

		_, err = t.Activity.Create().
			SetUserID(authorID).
			SetUsername(username).
			SetAction("challenge.create").
			SetResourceType("challenge").
			SetResourceID(c.ID).
			SetDetail(fmt.Sprintf("created challenge: %s", c.Title)).
			SetIP(ip).
			Save(ctx)
		if err != nil {
			return apperr.ErrInternal.WithMessage("failed to log activity: " + err.Error())
		}

		result = c
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *ChallengeService) Update(ctx context.Context, id int, req *models.UpdateChallengeRequest, userID int, username, ip string) (*ent.Challenge, error) {
	networkTopology, err := normalizeNetworkTopology(req.NetworkTopology)
	if err != nil {
		return nil, apperr.ErrBadRequest.WithMessage(err.Error())
	}

	var result *ent.Challenge
	err = tx.WithTx(ctx, s.client, func(t *ent.Tx) error {
		builder := t.Challenge.UpdateOneID(id)

		if req.Title != nil {
			builder = builder.SetTitle(*req.Title)
		}
		if req.Description != nil {
			builder = builder.SetDescription(*req.Description)
		}
		if req.Category != nil {
			builder = builder.SetCategory(*req.Category)
		}
		if req.Difficulty != nil {
			builder = builder.SetDifficulty(challenge.Difficulty(*req.Difficulty))
		}
		if req.BaseScore != nil {
			builder = builder.SetBaseScore(*req.BaseScore)
		}
		if req.MinScore != nil {
			builder = builder.SetMinScore(*req.MinScore)
		}
		if req.DecayFactor != nil {
			builder = builder.SetDecayFactor(*req.DecayFactor)
		}
		if req.FlagType != nil {
			builder = builder.SetFlagType(challenge.FlagType(*req.FlagType))
		}
		if req.StaticFlag != nil {
			builder = builder.SetStaticFlag(*req.StaticFlag)
		}
		if req.FlagTemplate != nil {
			builder = builder.SetFlagTemplate(*req.FlagTemplate)
		}
		if req.FlagRegex != nil {
			builder = builder.SetFlagRegex(*req.FlagRegex)
		}
		if req.IsDynamic != nil {
			builder = builder.SetIsDynamic(*req.IsDynamic)
		}
		if req.DockerImage != nil {
			builder = builder.SetDockerImage(*req.DockerImage)
		}
		if req.DockerCompose != nil {
			builder = builder.SetDockerCompose(*req.DockerCompose)
		}
		if req.NetworkTopology != nil {
			builder = builder.SetNetworkTopology(networkTopology)
		}
		if req.ExposedPorts != nil {
			builder = builder.SetExposedPorts(req.ExposedPorts)
		}
		if req.EnvVars != nil {
			builder = builder.SetEnvVars(req.EnvVars)
		}
		if req.ResourceLimits != nil {
			builder = builder.SetResourceLimits(req.ResourceLimits)
		}
		if req.MaxContainerDuration != nil {
			builder = builder.SetMaxContainerDuration(*req.MaxContainerDuration)
		}
		if req.HintCost != nil {
			builder = builder.SetHintCost(*req.HintCost)
		}
		if req.AttachmentIDs != nil {
			builder = builder.SetAttachmentIds(req.AttachmentIDs)
		}
		if req.IsHidden != nil {
			builder = builder.SetIsHidden(*req.IsHidden)
		}

		c, err := builder.Save(ctx)
		if err != nil {
			if ent.IsNotFound(err) {
				return apperr.ErrNotFound.WithMessage("challenge not found")
			}
			return apperr.ErrInternal.WithMessage("failed to update challenge: " + err.Error())
		}

		_, err = t.Activity.Create().
			SetUserID(userID).
			SetUsername(username).
			SetAction("challenge.update").
			SetResourceType("challenge").
			SetResourceID(c.ID).
			SetDetail(fmt.Sprintf("updated challenge: %s", c.Title)).
			SetIP(ip).
			Save(ctx)
		if err != nil {
			return apperr.ErrInternal.WithMessage("failed to log activity: " + err.Error())
		}

		result = c
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *ChallengeService) Delete(ctx context.Context, id int, userID int, username, ip string) error {
	c, err := s.client.Challenge.Get(ctx, id)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("challenge not found")
		}
		return apperr.ErrInternal.WithMessage("failed to get challenge: " + err.Error())
	}

	return tx.WithTx(ctx, s.client, func(t *ent.Tx) error {
		if err := t.Challenge.DeleteOneID(id).Exec(ctx); err != nil {
			return apperr.ErrInternal.WithMessage("failed to delete challenge: " + err.Error())
		}

		_, err := t.Activity.Create().
			SetUserID(userID).
			SetUsername(username).
			SetAction("challenge.delete").
			SetResourceType("challenge").
			SetResourceID(id).
			SetDetail(fmt.Sprintf("deleted challenge: %s", c.Title)).
			SetIP(ip).
			Save(ctx)
		if err != nil {
			return apperr.ErrInternal.WithMessage("failed to log activity: " + err.Error())
		}

		return nil
	})
}

func (s *ChallengeService) CreateHint(ctx context.Context, challengeID int, req *models.CreateHintRequest) (*ent.ChallengeHint, error) {
	_, err := s.client.Challenge.Get(ctx, challengeID)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("challenge not found")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to get challenge: " + err.Error())
	}

	hint, err := s.client.ChallengeHint.Create().
		SetChallengeID(challengeID).
		SetContent(req.Content).
		SetCost(req.Cost).
		SetOrderNum(req.OrderNum).
		Save(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to create hint: " + err.Error())
	}
	return hint, nil
}

func (s *ChallengeService) UpdateHint(ctx context.Context, hintID int, req *models.UpdateHintRequest) (*ent.ChallengeHint, error) {
	builder := s.client.ChallengeHint.UpdateOneID(hintID)
	if req.Content != nil {
		builder = builder.SetContent(*req.Content)
	}
	if req.Cost != nil {
		builder = builder.SetCost(*req.Cost)
	}
	if req.OrderNum != nil {
		builder = builder.SetOrderNum(*req.OrderNum)
	}

	hint, err := builder.Save(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("hint not found")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to update hint: " + err.Error())
	}
	return hint, nil
}

func (s *ChallengeService) DeleteHint(ctx context.Context, hintID int) error {
	err := s.client.ChallengeHint.DeleteOneID(hintID).Exec(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("hint not found")
		}
		return apperr.ErrInternal.WithMessage("failed to delete hint: " + err.Error())
	}
	return nil
}

func buildChallengeResponse(c *ent.Challenge) models.ChallengeResponse {
	resp := models.ChallengeResponse{
		ID:                   c.ID,
		Title:                c.Title,
		Description:          c.Description,
		Mode:                 string(c.Mode),
		Category:             c.Category,
		Difficulty:           string(c.Difficulty),
		BaseScore:            c.BaseScore,
		MinScore:             c.MinScore,
		DecayFactor:          c.DecayFactor,
		FlagType:             string(c.FlagType),
		IsDynamic:            c.IsDynamic,
		DockerImage:          c.DockerImage,
		DockerCompose:        c.DockerCompose,
		NetworkTopology:      networkTopologyFromMap(c.NetworkTopology),
		ExposedPorts:         c.ExposedPorts,
		EnvVars:              c.EnvVars,
		ResourceLimits:       c.ResourceLimits,
		MaxContainerDuration: c.MaxContainerDuration,
		HintCost:             c.HintCost,
		AttachmentIDs:        c.AttachmentIds,
		AuthorID:             c.AuthorID,
		IsHidden:             c.IsHidden,
		SolveCount:           c.SolveCount,
		CreatedAt:            c.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:            c.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}

	if c.Edges.Author != nil {
		resp.AuthorName = c.Edges.Author.Username
	}

	if c.Edges.Tags != nil {
		resp.Tags = make([]models.ChallengeTagResponse, 0, len(c.Edges.Tags))
		for _, t := range c.Edges.Tags {
			resp.Tags = append(resp.Tags, models.ChallengeTagResponse{
				ID:    t.ID,
				Name:  t.Name,
				Color: t.Color,
			})
		}
	}

	if c.Edges.Hints != nil {
		resp.Hints = make([]models.ChallengeHintResponse, 0, len(c.Edges.Hints))
		for _, h := range c.Edges.Hints {
			resp.Hints = append(resp.Hints, models.ChallengeHintResponse{
				ID:        h.ID,
				Content:   h.Content,
				Cost:      h.Cost,
				OrderNum:  h.OrderNum,
				CreatedAt: h.CreatedAt.Format("2006-01-02T15:04:05Z"),
			})
		}
	}

	return resp
}

func normalizeNetworkTopology(topology *models.NetworkTopology) (map[string]interface{}, error) {
	if topology == nil {
		return nil, nil
	}
	if err := topology.Validate(); err != nil {
		return nil, err
	}
	if topology.IsEmpty() {
		return map[string]interface{}{}, nil
	}

	data, err := json.Marshal(topology)
	if err != nil {
		return nil, err
	}
	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result, nil
}

func networkTopologyFromMap(raw map[string]interface{}) *models.NetworkTopology {
	if len(raw) == 0 {
		return nil
	}
	data, err := json.Marshal(raw)
	if err != nil {
		return nil
	}
	var topology models.NetworkTopology
	if err := json.Unmarshal(data, &topology); err != nil {
		return nil
	}
	return &topology
}

type PortalChallenge struct {
	ID          int                           `json:"id"`
	Title       string                        `json:"title"`
	Description string                        `json:"description"`
	Category    string                        `json:"category"`
	Difficulty  string                        `json:"difficulty"`
	Score       int                           `json:"score"`
	SolveCount  int                           `json:"solve_count"`
	IsDynamic   bool                          `json:"is_dynamic"`
	IsSolved    bool                          `json:"is_solved"`
	Tags        []models.ChallengeTagResponse `json:"tags"`
	Hints       []PortalHint                  `json:"hints"`
}

type PortalHint struct {
	ID       int    `json:"id"`
	Cost     int    `json:"cost"`
	OrderNum int    `json:"order_num"`
	Content  string `json:"content"`
	Unlocked bool   `json:"unlocked"`
}

func (s *ChallengeService) ListPortalChallenges(ctx context.Context, competitionID, teamID int) ([]PortalChallenge, error) {
	ccs, err := s.client.CompetitionChallenge.Query().
		Where(competitionchallenge.CompetitionID(competitionID), competitionchallenge.IsVisible(true)).
		WithChallenge(func(q *ent.ChallengeQuery) {
			q.WithTags().WithHints(func(hq *ent.ChallengeHintQuery) {
				hq.Order(ent.Asc(challengehint.FieldOrderNum))
			})
		}).
		Order(ent.Asc(competitionchallenge.FieldOrderNum)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list challenges: " + err.Error())
	}

	result := make([]PortalChallenge, 0, len(ccs))
	for _, cc := range ccs {
		chal := cc.Edges.Challenge
		if chal == nil {
			continue
		}

		solved, _ := s.client.FlagSubmission.Query().Where(
			flagsubmission.CompetitionID(competitionID),
			flagsubmission.ChallengeID(chal.ID),
			flagsubmission.TeamID(teamID),
			flagsubmission.IsCorrect(true),
		).Exist(ctx)

		score := s.calculateCurrentScore(chal)

		tags := make([]models.ChallengeTagResponse, 0)
		for _, t := range chal.Edges.Tags {
			tags = append(tags, models.ChallengeTagResponse{ID: t.ID, Name: t.Name, Color: t.Color})
		}

		hints := make([]PortalHint, 0)
		for _, h := range chal.Edges.Hints {
			hints = append(hints, PortalHint{
				ID: h.ID, Cost: h.Cost, OrderNum: h.OrderNum,
				Content: "", Unlocked: false,
			})
		}

		result = append(result, PortalChallenge{
			ID:          chal.ID,
			Title:       chal.Title,
			Description: chal.Description,
			Category:    chal.Category,
			Difficulty:  string(chal.Difficulty),
			Score:       score,
			SolveCount:  chal.SolveCount,
			IsDynamic:   chal.IsDynamic,
			IsSolved:    solved,
			Tags:        tags,
			Hints:       hints,
		})
	}
	return result, nil
}

func (s *ChallengeService) calculateCurrentScore(chal *ent.Challenge) int {
	S := float64(chal.BaseScore)
	r := float64(chal.MinScore) / S
	d := chal.DecayFactor
	x := float64(chal.SolveCount)
	score := S * (r + (1-r)*math.Exp((1-x)/d))
	result := int(math.Max(float64(chal.MinScore), math.Floor(score)))
	return result
}
