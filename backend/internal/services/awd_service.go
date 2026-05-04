package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"go.uber.org/zap"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/challengeinstance"
	"github.com/ZacharyZcR/STC/backend/ent/competition"
	"github.com/ZacharyZcR/STC/backend/ent/competitionchallenge"
	"github.com/ZacharyZcR/STC/backend/ent/flagsubmission"
	"github.com/ZacharyZcR/STC/backend/ent/scorerecord"
	"github.com/ZacharyZcR/STC/backend/ent/scoringround"
	"github.com/ZacharyZcR/STC/backend/ent/teamregistration"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type AWDService struct {
	client    *ent.Client
	container *ContainerService
	secretKey string
	logger    *zap.Logger
}

func NewAWDService(client *ent.Client, container *ContainerService, secretKey string, logger *zap.Logger) *AWDService {
	return &AWDService{
		client:    client,
		container: container,
		secretKey: secretKey,
		logger:    logger,
	}
}

func (s *AWDService) AWDNetworkName(competitionID int) string {
	return fmt.Sprintf("%s_awd_%d", s.container.netPrefix, competitionID)
}

func (s *AWDService) AWDChallengeNetworkName(competitionID, challengeID int) string {
	return fmt.Sprintf("%s_awd_%d_chal_%d", s.container.netPrefix, competitionID, challengeID)
}

func (s *AWDService) SetupAWDEnvironment(ctx context.Context, competitionID int) error {
	comp, err := s.client.Competition.Get(ctx, competitionID)
	if err != nil {
		return apperr.ErrNotFound.WithMessage("competition not found")
	}
	if comp.Mode != competition.ModeAwd {
		return apperr.ErrBadRequest.WithMessage("not an AWD competition")
	}

	networkName := s.AWDNetworkName(competitionID)
	if _, err := s.container.EnsureNetwork(ctx, networkName); err != nil {
		return apperr.ErrInternal.WithMessage("failed to create AWD network: " + err.Error())
	}

	s.logger.Info("AWD environment setup", zap.Int("competition_id", competitionID), zap.String("network", networkName))
	return nil
}

type DeployResult struct {
	Deployed int      `json:"deployed"`
	Failed   int      `json:"failed"`
	Errors   []string `json:"errors,omitempty"`
}

func (s *AWDService) DeployServices(ctx context.Context, competitionID int) (*DeployResult, error) {
	comp, err := s.client.Competition.Get(ctx, competitionID)
	if err != nil {
		return nil, apperr.ErrNotFound.WithMessage("competition not found")
	}
	if comp.Mode != competition.ModeAwd {
		return nil, apperr.ErrBadRequest.WithMessage("not an AWD competition")
	}

	if err := s.SetupAWDEnvironment(ctx, competitionID); err != nil {
		return nil, err
	}

	regs, err := s.client.TeamRegistration.Query().
		Where(teamregistration.CompetitionID(competitionID), teamregistration.StatusEQ(teamregistration.StatusApproved)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to get teams: " + err.Error())
	}

	ccs, err := s.client.CompetitionChallenge.Query().
		Where(competitionchallenge.CompetitionID(competitionID), competitionchallenge.IsVisible(true)).
		WithChallenge().All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to get challenges: " + err.Error())
	}

	result := &DeployResult{}

	for _, cc := range ccs {
		chal := cc.Edges.Challenge
		if chal == nil || !chal.IsDynamic || chal.DockerImage == "" {
			continue
		}

		chalNetwork := s.AWDChallengeNetworkName(competitionID, chal.ID)
		if _, err := s.container.EnsureNetwork(ctx, chalNetwork); err != nil {
			result.Failed += len(regs)
			result.Errors = append(result.Errors, fmt.Sprintf("challenge %d network: %v", chal.ID, err))
			continue
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

		for _, reg := range regs {
			existing, _ := s.client.ChallengeInstance.Query().
				Where(
					challengeinstance.CompetitionID(competitionID),
					challengeinstance.TeamID(reg.TeamID),
					challengeinstance.ChallengeID(chal.ID),
					challengeinstance.StatusIn(challengeinstance.StatusRunning, challengeinstance.StatusStarting),
				).Exist(ctx)
			if existing {
				continue
			}

			flag := GenerateDynamicFlag(chal.ID, reg.TeamID, competitionID, fmt.Sprintf("%s:0", s.secretKey))
			sshPass := generateSSHPassword()
			expiresAt := time.Now().Add(24 * time.Hour)

			env := map[string]string{"FLAG": flag, "SSH_PASSWORD": sshPass}
			if chal.EnvVars != nil {
				for k, v := range chal.EnvVars {
					env[k] = v
				}
			}

			allPorts := append([]string{"22"}, exposedPorts...)

			info, err := s.container.CreateAndStart(ctx, &ContainerConfig{
				Image:         chal.DockerImage,
				Env:           env,
				ExposedPorts:  allPorts,
				CPULimit:      cpuLimit,
				MemoryLimit:   memLimit,
				PidsLimit:     pidsLimit,
				NetworkName:   chalNetwork,
				ContainerName: s.container.ContainerName(chal.ID, competitionID, reg.TeamID),
				Labels: map[string]string{
					"managed-by":     "security-range",
					"mode":           "awd",
					"challenge-id":   fmt.Sprintf("%d", chal.ID),
					"competition-id": fmt.Sprintf("%d", competitionID),
					"team-id":        fmt.Sprintf("%d", reg.TeamID),
				},
			})
			if err != nil {
				result.Failed++
				result.Errors = append(result.Errors, fmt.Sprintf("team %d challenge %d: %v", reg.TeamID, chal.ID, err))
				continue
			}

			accessURL := s.container.BuildAccessURL(info.Ports)
			sshAddr := ""
			if sshPort, ok := info.Ports["22/tcp"]; ok {
				sshAddr = fmt.Sprintf("%s:%s", s.container.baseURL, sshPort)
			}
			now := time.Now()
			_, _ = s.client.ChallengeInstance.Create().
				SetChallengeID(chal.ID).
				SetCompetitionID(competitionID).
				SetTeamID(reg.TeamID).
				SetContainerID(info.ContainerID).
				SetStatus(challengeinstance.StatusRunning).
				SetAccessURL(accessURL).
				SetPorts(info.Ports).
				SetNetworkID(info.NetworkID).
				SetFlag(flag).
				SetSSHUser("ctf").
				SetSSHPassword(sshPass).
				SetSSHAddress(sshAddr).
				SetExpiresAt(expiresAt).
				SetStartedAt(now).
				Save(ctx)

			result.Deployed++
		}
	}

	s.logger.Info("AWD services deployed",
		zap.Int("competition_id", competitionID),
		zap.Int("deployed", result.Deployed),
		zap.Int("failed", result.Failed),
	)
	return result, nil
}

func (s *AWDService) GetTeamServices(ctx context.Context, competitionID, teamID int) ([]models.InstanceResponse, error) {
	instances, err := s.client.ChallengeInstance.Query().
		Where(
			challengeinstance.CompetitionID(competitionID),
			challengeinstance.TeamID(teamID),
		).
		WithChallenge().
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to query instances: " + err.Error())
	}

	items := make([]models.InstanceResponse, 0, len(instances))
	for _, inst := range instances {
		item := models.InstanceResponse{
			ID:            inst.ID,
			ChallengeID:   inst.ChallengeID,
			CompetitionID: inst.CompetitionID,
			TeamID:        inst.TeamID,
			ContainerID:   inst.ContainerID,
			Status:        string(inst.Status),
			AccessURL:     inst.AccessURL,
			Ports:         inst.Ports,
			SSHUser:       inst.SSHUser,
			SSHPassword:   inst.SSHPassword,
			SSHAddress:    inst.SSHAddress,
			ExpiresAt:     inst.ExpiresAt.Format("2006-01-02T15:04:05Z"),
			CreatedAt:     inst.CreatedAt.Format("2006-01-02T15:04:05Z"),
		}
		if inst.Edges.Challenge != nil {
			item.ChallengeName = inst.Edges.Challenge.Title
		}
		if inst.StartedAt != nil {
			item.StartedAt = inst.StartedAt.Format("2006-01-02T15:04:05Z")
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *AWDService) RotateFlags(ctx context.Context, competitionID, roundNumber int) (int, error) {
	instances, err := s.client.ChallengeInstance.Query().
		Where(
			challengeinstance.CompetitionID(competitionID),
			challengeinstance.StatusEQ(challengeinstance.StatusRunning),
		).All(ctx)
	if err != nil {
		return 0, apperr.ErrInternal.WithMessage("failed to query instances: " + err.Error())
	}

	rotated := 0
	for _, inst := range instances {
		newFlag := GenerateDynamicFlag(inst.ChallengeID, inst.TeamID, competitionID,
			fmt.Sprintf("%s:%d", s.secretKey, roundNumber))

		_, err := s.client.ChallengeInstance.UpdateOneID(inst.ID).
			SetFlag(newFlag).
			Save(ctx)
		if err != nil {
			continue
		}

		if inst.ContainerID != "" {
			writeCmd := []string{"sh", "-c", fmt.Sprintf("echo -n '%s' > /flag", newFlag)}
			if err := s.container.ExecInContainer(ctx, inst.ContainerID, writeCmd); err != nil {
				s.logger.Warn("failed to inject flag into container",
					zap.String("container", inst.ContainerID),
					zap.Error(err),
				)
			}
		}

		rotated++
	}

	s.logger.Info("AWD flags rotated",
		zap.Int("competition_id", competitionID),
		zap.Int("round", roundNumber),
		zap.Int("rotated", rotated),
	)
	return rotated, nil
}

func (s *AWDService) SubmitAWDFlag(ctx context.Context, competitionID, attackerTeamID, userID int, challengeID int, submittedFlag, ip string) (*models.SubmitFlagResponse, error) {
	comp, err := s.client.Competition.Get(ctx, competitionID)
	if err != nil || comp.Status != competition.StatusRunning || comp.Mode != competition.ModeAwd {
		return nil, apperr.ErrBadRequest.WithMessage("invalid AWD competition")
	}

	registered, _ := s.client.TeamRegistration.Query().
		Where(
			teamregistration.CompetitionID(competitionID),
			teamregistration.TeamID(attackerTeamID),
			teamregistration.StatusEQ(teamregistration.StatusApproved),
		).Exist(ctx)
	if !registered {
		return nil, apperr.ErrForbidden.WithMessage("team not registered")
	}

	cc, err := s.client.CompetitionChallenge.Query().
		Where(
			competitionchallenge.CompetitionID(competitionID),
			competitionchallenge.ChallengeID(challengeID),
			competitionchallenge.IsVisible(true),
		).Only(ctx)
	if err != nil {
		return nil, apperr.ErrNotFound.WithMessage("challenge not in this competition")
	}
	_ = cc

	instances, err := s.client.ChallengeInstance.Query().
		Where(
			challengeinstance.CompetitionID(competitionID),
			challengeinstance.ChallengeID(challengeID),
			challengeinstance.StatusEQ(challengeinstance.StatusRunning),
		).All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to query instances: " + err.Error())
	}

	var victimTeamID int
	for _, inst := range instances {
		if inst.TeamID == attackerTeamID {
			continue
		}
		if inst.Flag != "" && inst.Flag == submittedFlag {
			victimTeamID = inst.TeamID
			break
		}
	}

	sub, _ := s.client.FlagSubmission.Create().
		SetCompetitionID(competitionID).
		SetChallengeID(challengeID).
		SetTeamID(attackerTeamID).
		SetUserID(userID).
		SetSubmittedFlag(submittedFlag).
		SetIsCorrect(victimTeamID > 0).
		SetIP(ip).
		Save(ctx)
	_ = sub

	if victimTeamID == 0 {
		return &models.SubmitFlagResponse{
			Correct: false,
			Message: "incorrect flag",
		}, nil
	}

	alreadyAttacked, _ := s.client.FlagSubmission.Query().
		Where(
			flagsubmission.CompetitionID(competitionID),
			flagsubmission.ChallengeID(challengeID),
			flagsubmission.TeamID(attackerTeamID),
			flagsubmission.SubmittedFlag(submittedFlag),
			flagsubmission.IsCorrect(true),
			flagsubmission.IDNEQ(sub.ID),
		).Exist(ctx)

	awdCfg := DefaultAWDConfig()
	if comp.ScoringConfig != nil {
		if v, ok := comp.ScoringConfig["attack_score"]; ok {
			if f, ok := v.(float64); ok {
				awdCfg.AttackScore = int(f)
			}
		}
		if v, ok := comp.ScoringConfig["defense_score"]; ok {
			if f, ok := v.(float64); ok {
				awdCfg.DefenseScore = int(f)
			}
		}
	}

	if !alreadyAttacked {
		_, _ = s.client.ScoreRecord.Create().
			SetCompetitionID(competitionID).
			SetTeamID(attackerTeamID).
			SetChallengeID(challengeID).
			SetScoreType(scorerecord.ScoreTypeAwdAttack).
			SetPoints(awdCfg.AttackScore).
			SetDetail(fmt.Sprintf("attacked team %d on challenge %d", victimTeamID, challengeID)).
			Save(ctx)

		_, _ = s.client.ScoreRecord.Create().
			SetCompetitionID(competitionID).
			SetTeamID(victimTeamID).
			SetChallengeID(challengeID).
			SetScoreType(scorerecord.ScoreTypeAwdDefense).
			SetPoints(-awdCfg.AttackScore).
			SetDetail(fmt.Sprintf("pwned by team %d on challenge %d", attackerTeamID, challengeID)).
			Save(ctx)

		_, _ = s.client.FlagSubmission.UpdateOneID(sub.ID).
			SetPointsAwarded(awdCfg.AttackScore).
			Save(ctx)
	}

	return &models.SubmitFlagResponse{
		Correct:    true,
		Points:     awdCfg.AttackScore,
		FirstBlood: !alreadyAttacked,
		Message:    fmt.Sprintf("pwned team %d", victimTeamID),
	}, nil
}

func (s *AWDService) TeardownAWDEnvironment(ctx context.Context, competitionID int) error {
	instances, _ := s.client.ChallengeInstance.Query().
		Where(
			challengeinstance.CompetitionID(competitionID),
			challengeinstance.StatusIn(challengeinstance.StatusRunning, challengeinstance.StatusStarting),
		).All(ctx)

	for _, inst := range instances {
		if inst.ContainerID != "" {
			_ = s.container.StopAndRemove(ctx, inst.ContainerID)
		}
		now := time.Now()
		_, _ = s.client.ChallengeInstance.UpdateOneID(inst.ID).
			SetStatus(challengeinstance.StatusStopped).
			SetStoppedAt(now).
			Save(ctx)
	}

	_ = s.container.RemoveNetwork(ctx, s.AWDNetworkName(competitionID))

	ccs, _ := s.client.CompetitionChallenge.Query().
		Where(competitionchallenge.CompetitionID(competitionID)).All(ctx)
	for _, cc := range ccs {
		_ = s.container.RemoveNetwork(ctx, s.AWDChallengeNetworkName(competitionID, cc.ChallengeID))
	}

	s.logger.Info("AWD environment torn down", zap.Int("competition_id", competitionID))
	return nil
}

func (s *AWDService) PaidRestart(ctx context.Context, competitionID, challengeID, teamID int) (*models.InstanceResponse, error) {
	comp, err := s.client.Competition.Get(ctx, competitionID)
	if err != nil || comp.Mode != competition.ModeAwd || comp.Status != competition.StatusRunning {
		return nil, apperr.ErrBadRequest.WithMessage("invalid AWD competition")
	}

	restartCost := 50
	if comp.ScoringConfig != nil {
		if v, ok := comp.ScoringConfig["restart_cost"]; ok {
			if f, ok := v.(float64); ok {
				restartCost = int(f)
			}
		}
	}

	inst, err := s.client.ChallengeInstance.Query().
		Where(
			challengeinstance.CompetitionID(competitionID),
			challengeinstance.ChallengeID(challengeID),
			challengeinstance.TeamID(teamID),
		).
		Order(ent.Desc(challengeinstance.FieldCreatedAt)).
		First(ctx)
	if err != nil {
		return nil, apperr.ErrNotFound.WithMessage("no instance found")
	}

	if inst.ContainerID != "" {
		_ = s.container.StopAndRemove(ctx, inst.ContainerID)
	}

	_, _ = s.client.ScoreRecord.Create().
		SetCompetitionID(competitionID).
		SetTeamID(teamID).
		SetChallengeID(challengeID).
		SetScoreType(scorerecord.ScoreTypePenalty).
		SetPoints(-restartCost).
		SetDetail(fmt.Sprintf("paid restart challenge %d (-%d pts)", challengeID, restartCost)).
		Save(ctx)

	otherRegs, _ := s.client.TeamRegistration.Query().
		Where(
			teamregistration.CompetitionID(competitionID),
			teamregistration.StatusEQ(teamregistration.StatusApproved),
			teamregistration.TeamIDNEQ(teamID),
		).All(ctx)
	if len(otherRegs) > 0 {
		bonus := restartCost / len(otherRegs)
		if bonus > 0 {
			for _, r := range otherRegs {
				_, _ = s.client.ScoreRecord.Create().
					SetCompetitionID(competitionID).
					SetTeamID(r.TeamID).
					SetChallengeID(challengeID).
					SetScoreType(scorerecord.ScoreTypeBonus).
					SetPoints(bonus).
					SetDetail(fmt.Sprintf("team %d paid restart bonus", teamID)).
					Save(ctx)
			}
		}
	}

	currentRound, _ := s.client.ScoringRound.Query().
		Where(scoringround.CompetitionID(competitionID)).
		Order(ent.Desc(scoringround.FieldRoundNumber)).
		First(ctx)
	roundNum := 0
	if currentRound != nil {
		roundNum = currentRound.RoundNumber
	}
	newFlag := GenerateDynamicFlag(challengeID, teamID, competitionID, fmt.Sprintf("%s:%d", s.secretKey, roundNum))

	chal, err := s.client.Challenge.Get(ctx, challengeID)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to get challenge: " + err.Error())
	}

	newSSHPass := generateSSHPassword()
	env := map[string]string{"FLAG": newFlag, "SSH_PASSWORD": newSSHPass}
	if chal.EnvVars != nil {
		for k, v := range chal.EnvVars {
			env[k] = v
		}
	}
	exposedPorts := s.container.ParseExposedPorts(chal.ExposedPorts)
	if len(exposedPorts) == 0 {
		exposedPorts = []string{"80"}
	}
	allPorts := append([]string{"22"}, exposedPorts...)
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

	chalNetwork := s.AWDChallengeNetworkName(competitionID, challengeID)
	info, err := s.container.CreateAndStart(ctx, &ContainerConfig{
		Image:         chal.DockerImage,
		Env:           env,
		ExposedPorts:  allPorts,
		CPULimit:      cpuLimit,
		MemoryLimit:   memLimit,
		PidsLimit:     pidsLimit,
		NetworkName:   chalNetwork,
		ContainerName: s.container.ContainerName(challengeID, competitionID, teamID),
		Labels: map[string]string{
			"managed-by":     "security-range",
			"mode":           "awd",
			"challenge-id":   fmt.Sprintf("%d", challengeID),
			"competition-id": fmt.Sprintf("%d", competitionID),
			"team-id":        fmt.Sprintf("%d", teamID),
		},
	})
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to restart container: " + err.Error())
	}

	accessURL := s.container.BuildAccessURL(info.Ports)
	sshAddr := ""
	if sshPort, ok := info.Ports["22/tcp"]; ok {
		sshAddr = fmt.Sprintf("%s:%s", s.container.baseURL, sshPort)
	}
	now := time.Now()
	expiresAt := now.Add(24 * time.Hour)

	updated, err := s.client.ChallengeInstance.UpdateOneID(inst.ID).
		SetContainerID(info.ContainerID).
		SetStatus(challengeinstance.StatusRunning).
		SetAccessURL(accessURL).
		SetPorts(info.Ports).
		SetNetworkID(info.NetworkID).
		SetFlag(newFlag).
		SetSSHUser("ctf").
		SetSSHPassword(newSSHPass).
		SetSSHAddress(sshAddr).
		SetExpiresAt(expiresAt).
		SetStartedAt(now).
		ClearStoppedAt().
		Save(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to update instance: " + err.Error())
	}

	s.logger.Info("AWD paid restart",
		zap.Int("team_id", teamID),
		zap.Int("challenge_id", challengeID),
		zap.Int("cost", restartCost),
	)

	resp := &models.InstanceResponse{
		ID: updated.ID, ChallengeID: updated.ChallengeID, CompetitionID: updated.CompetitionID,
		TeamID: updated.TeamID, ContainerID: updated.ContainerID, Status: string(updated.Status),
		AccessURL: updated.AccessURL, Ports: updated.Ports,
		ExpiresAt: updated.ExpiresAt.Format("2006-01-02T15:04:05Z"),
		StartedAt: now.Format("2006-01-02T15:04:05Z"),
		CreatedAt: updated.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
	return resp, nil
}

func generateSSHPassword() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
