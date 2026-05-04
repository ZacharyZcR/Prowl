package services

import (
	"context"
	"fmt"
	"math"
	"math/rand"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/attackreport"
	"github.com/ZacharyZcR/STC/backend/ent/defensereport"
	"github.com/ZacharyZcR/STC/backend/ent/objective"
	"github.com/ZacharyZcR/STC/backend/ent/scenario"
	"github.com/ZacharyZcR/STC/backend/ent/scorerecord"
	"github.com/ZacharyZcR/STC/backend/ent/teamregistration"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/tx"
)

type ScenarioService struct {
	client   *ent.Client
	activity *ActivityService
}

func NewScenarioService(client *ent.Client, activity *ActivityService) *ScenarioService {
	return &ScenarioService{client: client, activity: activity}
}

func (s *ScenarioService) ListScenarios(ctx context.Context, q *models.ScenarioListQuery) (*models.PaginatedResponse, error) {
	query := s.client.Scenario.Query().WithCreator()

	if q.Search != "" {
		query = query.Where(scenario.NameContains(q.Search))
	}
	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 || q.PageSize > 100 {
		q.PageSize = 20
	}

	total, err := query.Count(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count scenarios: " + err.Error())
	}

	offset := (q.Page - 1) * q.PageSize
	scenarios, err := query.
		Limit(q.PageSize).Offset(offset).
		Order(ent.Desc(scenario.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list scenarios: " + err.Error())
	}

	items := make([]models.ScenarioResponse, 0, len(scenarios))
	for _, sc := range scenarios {
		items = append(items, buildScenarioResponse(sc))
	}

	return &models.PaginatedResponse{
		Items:      items,
		Total:      total,
		Page:       q.Page,
		PageSize:   q.PageSize,
		TotalPages: int(math.Ceil(float64(total) / float64(q.PageSize))),
	}, nil
}

func (s *ScenarioService) GetScenario(ctx context.Context, id int) (*models.ScenarioResponse, error) {
	sc, err := s.client.Scenario.Query().Where(scenario.ID(id)).WithCreator().Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("scenario not found")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to get scenario: " + err.Error())
	}
	resp := buildScenarioResponse(sc)
	return &resp, nil
}

func (s *ScenarioService) CreateScenario(ctx context.Context, req *models.CreateScenarioRequest, userID int, username, ip string) (*ent.Scenario, error) {
	var result *ent.Scenario
	err := tx.WithTx(ctx, s.client, func(t *ent.Tx) error {
		builder := t.Scenario.Create().
			SetName(req.Name).
			SetDescription(req.Description).
			SetTopology(req.Topology).
			SetDockerCompose(req.DockerCompose).
			SetDifficulty(req.Difficulty).
			SetEstimatedDuration(req.EstimatedDuration).
			SetCreatedBy(userID)

		if req.NetworkConfig != nil {
			builder = builder.SetNetworkConfig(req.NetworkConfig)
		}
		if req.Tags != nil {
			builder = builder.SetTags(req.Tags)
		}

		sc, err := builder.Save(ctx)
		if err != nil {
			return apperr.ErrInternal.WithMessage("failed to create scenario: " + err.Error())
		}

		_, _ = t.Activity.Create().
			SetUserID(userID).SetUsername(username).
			SetAction("scenario.create").SetResourceType("scenario").SetResourceID(sc.ID).
			SetDetail(fmt.Sprintf("created scenario: %s", sc.Name)).SetIP(ip).
			Save(ctx)

		result = sc
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *ScenarioService) UpdateScenario(ctx context.Context, id int, req *models.UpdateScenarioRequest) (*ent.Scenario, error) {
	builder := s.client.Scenario.UpdateOneID(id)
	if req.Name != nil {
		builder = builder.SetName(*req.Name)
	}
	if req.Description != nil {
		builder = builder.SetDescription(*req.Description)
	}
	if req.Topology != nil {
		builder = builder.SetTopology(*req.Topology)
	}
	if req.DockerCompose != nil {
		builder = builder.SetDockerCompose(*req.DockerCompose)
	}
	if req.NetworkConfig != nil {
		builder = builder.SetNetworkConfig(req.NetworkConfig)
	}
	if req.Difficulty != nil {
		builder = builder.SetDifficulty(*req.Difficulty)
	}
	if req.EstimatedDuration != nil {
		builder = builder.SetEstimatedDuration(*req.EstimatedDuration)
	}
	if req.Tags != nil {
		builder = builder.SetTags(req.Tags)
	}

	sc, err := builder.Save(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("scenario not found")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to update scenario: " + err.Error())
	}
	return sc, nil
}

func (s *ScenarioService) DeleteScenario(ctx context.Context, id int) error {
	err := s.client.Scenario.DeleteOneID(id).Exec(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("scenario not found")
		}
		return apperr.ErrInternal.WithMessage("failed to delete scenario: " + err.Error())
	}
	return nil
}

func (s *ScenarioService) ListObjectives(ctx context.Context, competitionID int, teamRole string, teamID int) ([]models.ObjectiveResponse, error) {
	query := s.client.Objective.Query().
		Where(objective.CompetitionID(competitionID)).
		Order(ent.Asc(objective.FieldOrderNum))

	if teamRole != "" {
		query = query.Where(objective.TeamRoleEQ(objective.TeamRole(teamRole)))
	}

	objs, err := query.All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list objectives: " + err.Error())
	}

	objIDs := make([]int, len(objs))
	for i, o := range objs {
		objIDs[i] = o.ID
	}

	attackCounts := make(map[int]int)
	defenseCounts := make(map[int]int)
	if len(objIDs) > 0 {
		aq := s.client.AttackReport.Query().
			Where(attackreport.CompetitionID(competitionID), attackreport.ObjectiveIDIn(objIDs...))
		if teamID > 0 {
			aq = aq.Where(attackreport.TeamID(teamID))
		}
		attacks, _ := aq.All(ctx)
		for _, a := range attacks {
			attackCounts[a.ObjectiveID]++
		}

		dq := s.client.DefenseReport.Query().
			Where(defensereport.CompetitionID(competitionID), defensereport.ObjectiveIDIn(objIDs...))
		if teamID > 0 {
			dq = dq.Where(defensereport.TeamID(teamID))
		}
		defenses, _ := dq.All(ctx)
		for _, d := range defenses {
			defenseCounts[d.ObjectiveID]++
		}
	}

	items := make([]models.ObjectiveResponse, 0, len(objs))
	for _, o := range objs {
		resp := buildObjectiveResponse(o)
		resp.ReportCount = attackCounts[o.ID] + defenseCounts[o.ID]
		items = append(items, resp)
	}
	return items, nil
}

func (s *ScenarioService) CreateObjective(ctx context.Context, competitionID int, req *models.CreateObjectiveRequest) (*ent.Objective, error) {
	builder := s.client.Objective.Create().
		SetCompetitionID(competitionID).
		SetTitle(req.Title).
		SetTargetURL(req.TargetURL).
		SetDescription(req.Description).
		SetTeamRole(objective.TeamRole(req.TeamRole)).
		SetPoints(req.Points).
		SetOrderNum(req.OrderNum)
	if req.ScenarioID > 0 {
		builder.SetScenarioID(req.ScenarioID)
	}
	if req.AssignedTeamID > 0 {
		builder.SetAssignedTeamID(req.AssignedTeamID)
	}
	obj, err := builder.Save(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to create objective: " + err.Error())
	}
	return obj, nil
}

func (s *ScenarioService) BatchCreateObjectives(ctx context.Context, competitionID int, reqs []models.CreateObjectiveRequest) (int, error) {
	bulk := make([]*ent.ObjectiveCreate, 0, len(reqs))
	for _, req := range reqs {
		b := s.client.Objective.Create().
			SetCompetitionID(competitionID).
			SetTitle(req.Title).
			SetTargetURL(req.TargetURL).
			SetDescription(req.Description).
			SetTeamRole(objective.TeamRole(req.TeamRole)).
			SetPoints(req.Points).
			SetOrderNum(req.OrderNum)
		if req.ScenarioID > 0 {
			b.SetScenarioID(req.ScenarioID)
		}
		if req.AssignedTeamID > 0 {
			b.SetAssignedTeamID(req.AssignedTeamID)
		}
		bulk = append(bulk, b)
	}
	created, err := s.client.Objective.CreateBulk(bulk...).Save(ctx)
	if err != nil {
		return 0, apperr.ErrInternal.WithMessage("failed to batch create objectives: " + err.Error())
	}
	return len(created), nil
}

func (s *ScenarioService) AssignObjective(ctx context.Context, objID, teamID int) error {
	_, err := s.client.Objective.UpdateOneID(objID).
		SetAssignedTeamID(teamID).
		Save(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("objective not found")
		}
		return apperr.ErrInternal.WithMessage("failed to assign objective: " + err.Error())
	}
	return nil
}

func (s *ScenarioService) AutoAssignObjectives(ctx context.Context, competitionID int, req *models.AutoAssignObjectivesRequest) (int, error) {
	regs, err := s.client.TeamRegistration.Query().
		Where(
			teamregistration.CompetitionID(competitionID),
			teamregistration.StatusEQ(teamregistration.StatusApproved),
		).
		WithTeam().
		All(ctx)
	if err != nil {
		return 0, apperr.ErrInternal.WithMessage("failed to query teams: " + err.Error())
	}
	if len(regs) == 0 {
		return 0, apperr.ErrBadRequest.WithMessage("no approved teams")
	}

	teamIDs := make([]int, 0)
	for _, r := range regs {
		teamIDs = append(teamIDs, r.TeamID)
	}

	objs, err := s.client.Objective.Query().
		Where(
			objective.CompetitionID(competitionID),
			objective.TeamRoleEQ(objective.TeamRole(req.TeamRole)),
			objective.AssignedTeamIDIsNil(),
		).
		All(ctx)
	if err != nil {
		return 0, apperr.ErrInternal.WithMessage("failed to query objectives: " + err.Error())
	}
	if len(objs) == 0 {
		return 0, apperr.ErrBadRequest.WithMessage("no unassigned objectives for role " + req.TeamRole)
	}

	assigned := 0
	switch req.Strategy {
	case "random":
		perm := rand.Perm(len(objs))
		for i, idx := range perm {
			tid := teamIDs[i%len(teamIDs)]
			_, err := s.client.Objective.UpdateOneID(objs[idx].ID).SetAssignedTeamID(tid).Save(ctx)
			if err == nil {
				assigned++
			}
		}
	case "round_robin":
		for i, obj := range objs {
			tid := teamIDs[i%len(teamIDs)]
			_, err := s.client.Objective.UpdateOneID(obj.ID).SetAssignedTeamID(tid).Save(ctx)
			if err == nil {
				assigned++
			}
		}
	case "duplicate":
		for _, obj := range objs {
			for _, tid := range teamIDs {
				if tid == 0 {
					continue
				}
				_, err := s.client.Objective.Create().
					SetCompetitionID(competitionID).
					SetTitle(obj.Title).
					SetTargetURL(obj.TargetURL).
					SetDescription(obj.Description).
					SetTeamRole(obj.TeamRole).
					SetPoints(obj.Points).
					SetOrderNum(obj.OrderNum).
					SetAssignedTeamID(tid).
					Save(ctx)
				if err == nil {
					assigned++
				}
			}
			_ = s.client.Objective.DeleteOneID(obj.ID).Exec(ctx)
		}
	}
	return assigned, nil
}

func (s *ScenarioService) JudgeObjective(ctx context.Context, objID int, req *models.JudgeObjectiveRequest, judgeID int) error {
	obj, err := s.client.Objective.Get(ctx, objID)
	if err != nil {
		return apperr.ErrNotFound.WithMessage("objective not found")
	}

	points := obj.Points
	if req.Points != nil {
		points = *req.Points
	}

	builder := s.client.Objective.UpdateOneID(objID).
		SetStatus(objective.Status(req.Status)).
		SetPoints(points).
		SetJudgeComment(req.Comment).
		SetJudgedBy(judgeID)

	_, err = builder.Save(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to judge objective: " + err.Error())
	}

	if req.Status == "completed" && obj.CompletedByTeam > 0 {
		_, _ = s.client.ScoreRecord.Create().
			SetCompetitionID(obj.CompetitionID).
			SetTeamID(obj.CompletedByTeam).
			SetScoreType(scorerecord.ScoreTypeBonus).
			SetPoints(points).
			SetDetail(fmt.Sprintf("objective completed: %s", obj.Title)).
			Save(ctx)
	}

	return nil
}

func (s *ScenarioService) JudgeScore(ctx context.Context, competitionID int, req *models.JudgeScoreRequest, judgeID int) error {
	_, _ = s.client.ScoreRecord.Create().
		SetCompetitionID(competitionID).
		SetTeamID(req.TeamID).
		SetChallengeID(req.ChallengeID).
		SetScoreType(scorerecord.ScoreTypeBonus).
		SetPoints(req.Points).
		SetDetail(req.Detail).
		Save(ctx)
	return nil
}

func (s *ScenarioService) SubmitObjectiveEvidence(ctx context.Context, objID int, req *models.CompleteObjectiveRequest) error {
	_, err := s.client.Objective.UpdateOneID(objID).
		SetStatus(objective.StatusInProgress).
		SetCompletedByTeam(req.TeamID).
		SetCompletedByUser(req.UserID).
		SetEvidence(req.Evidence).
		Save(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("objective not found")
		}
		return apperr.ErrInternal.WithMessage("failed to submit evidence: " + err.Error())
	}
	return nil
}

func buildScenarioResponse(sc *ent.Scenario) models.ScenarioResponse {
	resp := models.ScenarioResponse{
		ID:                sc.ID,
		Name:              sc.Name,
		Description:       sc.Description,
		Topology:          sc.Topology,
		DockerCompose:     sc.DockerCompose,
		Difficulty:        sc.Difficulty,
		EstimatedDuration: sc.EstimatedDuration,
		Tags:              sc.Tags,
		CreatedBy:         sc.CreatedBy,
		CreatedAt:         sc.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:         sc.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}
	if sc.NetworkConfig != nil {
		resp.NetworkConfig = sc.NetworkConfig
	}
	if sc.Edges.Creator != nil {
		resp.CreatorName = sc.Edges.Creator.Username
	}
	return resp
}

func derefInt(p *int) int {
	if p != nil {
		return *p
	}
	return 0
}

func buildObjectiveResponse(o *ent.Objective) models.ObjectiveResponse {
	resp := models.ObjectiveResponse{
		ID:              o.ID,
		CompetitionID:   o.CompetitionID,
		ScenarioID:      derefInt(o.ScenarioID),
		Title:           o.Title,
		TargetURL:       o.TargetURL,
		Description:     o.Description,
		TeamRole:        string(o.TeamRole),
		Points:          o.Points,
		OrderNum:        o.OrderNum,
		Status:          string(o.Status),
		AssignedTeamID:  derefInt(o.AssignedTeamID),
		CompletedByTeam: o.CompletedByTeam,
		CompletedByUser: o.CompletedByUser,
		Evidence:        o.Evidence,
		JudgeComment:    o.JudgeComment,
		JudgedBy:        o.JudgedBy,
		CreatedAt:       o.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
	if o.CompletedAt != nil {
		resp.CompletedAt = o.CompletedAt.Format("2006-01-02T15:04:05Z")
	}
	return resp
}
