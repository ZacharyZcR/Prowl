package services

import (
	"context"
	"fmt"
	"math"
	"time"

	"go.uber.org/zap"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/challenge"
	"github.com/ZacharyZcR/STC/backend/ent/challengeinstance"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type InstanceService struct {
	client     *ent.Client
	container  *ContainerService
	stack      *StackService
	secretKey  string
	maxPerTeam int
	maxTotal   int
	logger     *zap.Logger
}

func NewInstanceService(client *ent.Client, container *ContainerService, secretKey string, maxPerTeam, maxTotal int, logger *zap.Logger) *InstanceService {
	return &InstanceService{
		client:     client,
		container:  container,
		stack:      NewStackService(container, logger),
		secretKey:  secretKey,
		maxPerTeam: maxPerTeam,
		maxTotal:   maxTotal,
		logger:     logger,
	}
}

func (s *InstanceService) StartInstance(ctx context.Context, challengeID, competitionID, teamID int) (*models.InstanceResponse, error) {
	existing, err := s.client.ChallengeInstance.Query().
		Where(
			challengeinstance.ChallengeID(challengeID),
			challengeinstance.CompetitionID(competitionID),
			challengeinstance.TeamID(teamID),
			challengeinstance.StatusIn(
				challengeinstance.StatusPending,
				challengeinstance.StatusStarting,
				challengeinstance.StatusRunning,
			),
		).First(ctx)
	if err == nil {
		return s.buildResponse(existing), nil
	}

	_, _ = s.client.ChallengeInstance.Delete().Where(
		challengeinstance.ChallengeID(challengeID),
		challengeinstance.CompetitionID(competitionID),
		challengeinstance.TeamID(teamID),
		challengeinstance.StatusIn(challengeinstance.StatusError, challengeinstance.StatusStopped),
	).Exec(ctx)

	teamCount, _ := s.client.ChallengeInstance.Query().
		Where(
			challengeinstance.TeamID(teamID),
			challengeinstance.StatusIn(challengeinstance.StatusRunning, challengeinstance.StatusStarting, challengeinstance.StatusPending),
		).Count(ctx)
	if teamCount >= s.maxPerTeam {
		return nil, apperr.ErrBadRequest.WithMessage(fmt.Sprintf("max %d running instances per team", s.maxPerTeam))
	}

	totalCount, _ := s.client.ChallengeInstance.Query().
		Where(challengeinstance.StatusIn(challengeinstance.StatusRunning, challengeinstance.StatusStarting)).
		Count(ctx)
	if totalCount >= s.maxTotal {
		return nil, apperr.ErrBadRequest.WithMessage("platform instance limit reached, try again later")
	}

	chal, err := s.client.Challenge.Query().
		Where(challenge.ID(challengeID), challenge.IsDynamic(true)).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrBadRequest.WithMessage("challenge is not dynamic or not found")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to get challenge: " + err.Error())
	}

	flag := GenerateDynamicFlag(challengeID, teamID, competitionID, s.secretKey)
	duration := time.Duration(chal.MaxContainerDuration) * time.Second
	expiresAt := time.Now().Add(duration)

	inst, err := s.client.ChallengeInstance.Create().
		SetChallengeID(challengeID).
		SetCompetitionID(competitionID).
		SetTeamID(teamID).
		SetStatus(challengeinstance.StatusStarting).
		SetFlag(flag).
		SetExpiresAt(expiresAt).
		Save(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to create instance record: " + err.Error())
	}

	topology := networkTopologyFromMap(chal.NetworkTopology)
	if topology != nil && !topology.IsEmpty() {
		return s.startStackInstance(ctx, inst, chal, topology, flag)
	}

	env := map[string]string{"FLAG": flag}
	if chal.EnvVars != nil {
		for k, v := range chal.EnvVars {
			env[k] = v
		}
	}

	exposedPorts := s.container.ParseExposedPorts(chal.ExposedPorts)
	if len(exposedPorts) == 0 {
		exposedPorts = []string{"80"}
	}

	var cpuLimit, memLimit, pidsLimit int64
	if chal.ResourceLimits != nil {
		cpuLimit, memLimit, pidsLimit = s.container.ParseResourceLimits(chal.ResourceLimits)
	}
	if memLimit == 0 {
		memLimit = 256 * 1024 * 1024
	}
	if pidsLimit == 0 {
		pidsLimit = 100
	}

	info, err := s.container.CreateAndStart(ctx, &ContainerConfig{
		Image:         chal.DockerImage,
		Env:           env,
		ExposedPorts:  exposedPorts,
		CPULimit:      cpuLimit,
		MemoryLimit:   memLimit,
		PidsLimit:     pidsLimit,
		NetworkName:   s.container.NetworkName(competitionID, teamID),
		ContainerName: s.container.ContainerName(challengeID, competitionID, teamID),
		Labels: map[string]string{
			"managed-by":     "security-range",
			"challenge-id":   fmt.Sprintf("%d", challengeID),
			"competition-id": fmt.Sprintf("%d", competitionID),
			"team-id":        fmt.Sprintf("%d", teamID),
		},
	})
	if err != nil {
		s.logger.Error("failed to start container", zap.Error(err))
		_, _ = s.client.ChallengeInstance.UpdateOneID(inst.ID).
			SetStatus(challengeinstance.StatusError).
			Save(ctx)
		return nil, apperr.ErrInternal.WithMessage("failed to start container: " + err.Error())
	}

	accessURL := s.container.BuildAccessURL(info.Ports)
	now := time.Now()

	inst, err = s.client.ChallengeInstance.UpdateOneID(inst.ID).
		SetContainerID(info.ContainerID).
		SetStatus(challengeinstance.StatusRunning).
		SetAccessURL(accessURL).
		SetPorts(info.Ports).
		SetNetworkID(info.NetworkID).
		SetStartedAt(now).
		Save(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to update instance record: " + err.Error())
	}

	return s.buildResponse(inst), nil
}

func (s *InstanceService) StopInstance(ctx context.Context, challengeID, competitionID, teamID int) error {
	inst, err := s.client.ChallengeInstance.Query().
		Where(
			challengeinstance.ChallengeID(challengeID),
			challengeinstance.CompetitionID(competitionID),
			challengeinstance.TeamID(teamID),
			challengeinstance.StatusIn(challengeinstance.StatusRunning, challengeinstance.StatusStarting, challengeinstance.StatusPending),
		).First(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("no running instance found")
		}
		return apperr.ErrInternal.WithMessage("failed to query instance: " + err.Error())
	}

	_ = s.cleanupInstanceResources(ctx, inst)

	now := time.Now()
	_, err = s.client.ChallengeInstance.UpdateOneID(inst.ID).
		SetStatus(challengeinstance.StatusStopped).
		SetStoppedAt(now).
		Save(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to update instance: " + err.Error())
	}
	return nil
}

func (s *InstanceService) GetInstanceStatus(ctx context.Context, challengeID, competitionID, teamID int) (*models.InstanceResponse, error) {
	inst, err := s.client.ChallengeInstance.Query().
		Where(
			challengeinstance.ChallengeID(challengeID),
			challengeinstance.CompetitionID(competitionID),
			challengeinstance.TeamID(teamID),
		).
		Order(ent.Desc(challengeinstance.FieldCreatedAt)).
		First(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("no instance found")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to query instance: " + err.Error())
	}
	return s.buildResponse(inst), nil
}

func (s *InstanceService) GetInstance(ctx context.Context, instanceID int) (*models.InstanceResponse, error) {
	inst, err := s.client.ChallengeInstance.Query().
		Where(challengeinstance.ID(instanceID)).
		WithChallenge().
		WithTeam().
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("instance not found")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to query instance: " + err.Error())
	}

	resp := s.buildResponse(inst)
	if inst.Edges.Challenge != nil {
		resp.ChallengeName = inst.Edges.Challenge.Title
	}
	if inst.Edges.Team != nil {
		resp.TeamName = inst.Edges.Team.Name
	}
	return resp, nil
}

func (s *InstanceService) ForceRemove(ctx context.Context, instanceID int) error {
	inst, err := s.client.ChallengeInstance.Get(ctx, instanceID)
	if err != nil {
		return apperr.ErrNotFound.WithMessage("instance not found")
	}
	_ = s.cleanupInstanceResources(ctx, inst)
	now := time.Now()
	_, err = s.client.ChallengeInstance.UpdateOneID(inst.ID).
		SetStatus(challengeinstance.StatusStopped).
		SetStoppedAt(now).
		Save(ctx)
	return err
}

func (s *InstanceService) RenewInstance(ctx context.Context, instanceID int, extraSeconds int) error {
	inst, err := s.client.ChallengeInstance.Get(ctx, instanceID)
	if err != nil {
		return apperr.ErrNotFound.WithMessage("instance not found")
	}
	if inst.Status != challengeinstance.StatusRunning {
		return apperr.ErrBadRequest.WithMessage("instance is not running")
	}
	newExpiry := inst.ExpiresAt.Add(time.Duration(extraSeconds) * time.Second)
	_, err = s.client.ChallengeInstance.UpdateOneID(inst.ID).
		SetExpiresAt(newExpiry).
		Save(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to renew instance: " + err.Error())
	}
	return nil
}

func (s *InstanceService) BatchCleanup(ctx context.Context) (int, error) {
	return s.CleanupExpired(ctx)
}

func (s *InstanceService) ListInstances(ctx context.Context, q *models.InstanceListQuery) (*models.PaginatedResponse, error) {
	query := s.client.ChallengeInstance.Query().
		WithChallenge().
		WithTeam()

	if q.CompetitionID > 0 {
		query = query.Where(challengeinstance.CompetitionID(q.CompetitionID))
	}
	if q.TeamID > 0 {
		query = query.Where(challengeinstance.TeamID(q.TeamID))
	}
	if q.Status != "" {
		query = query.Where(challengeinstance.StatusEQ(challengeinstance.Status(q.Status)))
	}

	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 || q.PageSize > 100 {
		q.PageSize = 20
	}

	total, err := query.Count(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count instances: " + err.Error())
	}

	offset := (q.Page - 1) * q.PageSize
	instances, err := query.
		Limit(q.PageSize).
		Offset(offset).
		Order(ent.Desc(challengeinstance.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list instances: " + err.Error())
	}

	items := make([]models.InstanceResponse, 0, len(instances))
	for _, inst := range instances {
		resp := s.buildResponse(inst)
		if inst.Edges.Challenge != nil {
			resp.ChallengeName = inst.Edges.Challenge.Title
		}
		if inst.Edges.Team != nil {
			resp.TeamName = inst.Edges.Team.Name
		}
		items = append(items, *resp)
	}

	return &models.PaginatedResponse{
		Items:      items,
		Total:      total,
		Page:       q.Page,
		PageSize:   q.PageSize,
		TotalPages: int(math.Ceil(float64(total) / float64(q.PageSize))),
	}, nil
}

func (s *InstanceService) GetStats(ctx context.Context) (*models.InstanceStatsResponse, error) {
	total, _ := s.client.ChallengeInstance.Query().Count(ctx)
	running, _ := s.client.ChallengeInstance.Query().Where(challengeinstance.StatusEQ(challengeinstance.StatusRunning)).Count(ctx)
	pending, _ := s.client.ChallengeInstance.Query().Where(challengeinstance.StatusEQ(challengeinstance.StatusPending)).Count(ctx)
	stopped, _ := s.client.ChallengeInstance.Query().Where(challengeinstance.StatusEQ(challengeinstance.StatusStopped)).Count(ctx)
	errored, _ := s.client.ChallengeInstance.Query().Where(challengeinstance.StatusEQ(challengeinstance.StatusError)).Count(ctx)
	stacked, _ := s.client.ChallengeInstance.Query().Where(challengeinstance.StackIDNEQ("")).Count(ctx)

	return &models.InstanceStatsResponse{
		TotalInstances:   total,
		RunningInstances: running,
		PendingInstances: pending,
		StoppedInstances: stopped,
		ErrorInstances:   errored,
		StackInstances:   stacked,
	}, nil
}

func (s *InstanceService) CleanupExpired(ctx context.Context) (int, error) {
	now := time.Now()
	instances, err := s.client.ChallengeInstance.Query().
		Where(
			challengeinstance.StatusIn(challengeinstance.StatusRunning, challengeinstance.StatusStarting),
			challengeinstance.ExpiresAtLT(now),
		).All(ctx)
	if err != nil {
		return 0, err
	}

	cleaned := 0
	for _, inst := range instances {
		_ = s.cleanupInstanceResources(ctx, inst)
		stoppedAt := time.Now()
		_, err := s.client.ChallengeInstance.UpdateOneID(inst.ID).
			SetStatus(challengeinstance.StatusStopped).
			SetStoppedAt(stoppedAt).
			Save(ctx)
		if err == nil {
			cleaned++
		}
	}

	if cleaned > 0 {
		s.logger.Info("cleaned up expired instances", zap.Int("count", cleaned))
	}
	return cleaned, nil
}

func (s *InstanceService) buildResponse(inst *ent.ChallengeInstance) *models.InstanceResponse {
	resp := &models.InstanceResponse{
		ID:            inst.ID,
		ChallengeID:   inst.ChallengeID,
		CompetitionID: inst.CompetitionID,
		TeamID:        inst.TeamID,
		ContainerID:   inst.ContainerID,
		StackID:       inst.StackID,
		Containers:    inst.StackContainers,
		Networks:      inst.StackNetworks,
		Status:        string(inst.Status),
		AccessURL:     inst.AccessURL,
		Ports:         inst.Ports,
		ExpiresAt:     inst.ExpiresAt.Format("2006-01-02T15:04:05Z"),
		CreatedAt:     inst.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
	if inst.StartedAt != nil {
		resp.StartedAt = inst.StartedAt.Format("2006-01-02T15:04:05Z")
	}
	if inst.StoppedAt != nil {
		resp.StoppedAt = inst.StoppedAt.Format("2006-01-02T15:04:05Z")
	}
	return resp
}

func (s *InstanceService) startStackInstance(ctx context.Context, inst *ent.ChallengeInstance, chal *ent.Challenge, topology *models.NetworkTopology, flag string) (*models.InstanceResponse, error) {
	var cpuLimit, memLimit, pidsLimit int64
	if chal.ResourceLimits != nil {
		cpuLimit, memLimit, pidsLimit = s.container.ParseResourceLimits(chal.ResourceLimits)
	}
	if memLimit == 0 {
		memLimit = 256 * 1024 * 1024
	}
	if pidsLimit == 0 {
		pidsLimit = 100
	}

	info, err := s.stack.Start(ctx, StackConfig{
		ChallengeID:   inst.ChallengeID,
		CompetitionID: inst.CompetitionID,
		TeamID:        inst.TeamID,
		Flag:          flag,
		Topology:      topology,
		CPULimit:      cpuLimit,
		MemoryLimit:   memLimit,
		PidsLimit:     pidsLimit,
		Labels: map[string]string{
			"managed-by":     "security-range",
			"challenge-id":   fmt.Sprintf("%d", inst.ChallengeID),
			"competition-id": fmt.Sprintf("%d", inst.CompetitionID),
			"team-id":        fmt.Sprintf("%d", inst.TeamID),
		},
	})
	if err != nil {
		s.logger.Error("failed to start stack", zap.Error(err))
		_, _ = s.client.ChallengeInstance.UpdateOneID(inst.ID).
			SetStatus(challengeinstance.StatusError).
			Save(ctx)
		return nil, apperr.ErrInternal.WithMessage("failed to start stack: " + err.Error())
	}

	now := time.Now()
	accessURL := s.container.BuildAccessURL(info.Ports)
	updated, err := s.client.ChallengeInstance.UpdateOneID(inst.ID).
		SetContainerID(info.ContainerID).
		SetStackID(info.StackID).
		SetStackContainers(info.Containers).
		SetStackNetworks(info.Networks).
		SetStatus(challengeinstance.StatusRunning).
		SetAccessURL(accessURL).
		SetPorts(info.Ports).
		SetStartedAt(now).
		Save(ctx)
	if err != nil {
		_ = s.stack.Stop(ctx, info.Containers, info.Networks)
		return nil, apperr.ErrInternal.WithMessage("failed to update instance record: " + err.Error())
	}

	return s.buildResponse(updated), nil
}

func (s *InstanceService) cleanupInstanceResources(ctx context.Context, inst *ent.ChallengeInstance) error {
	if len(inst.StackContainers) > 0 || len(inst.StackNetworks) > 0 {
		return s.stack.Stop(ctx, inst.StackContainers, inst.StackNetworks)
	}
	if inst.ContainerID != "" {
		return s.container.StopAndRemove(ctx, inst.ContainerID)
	}
	return nil
}
