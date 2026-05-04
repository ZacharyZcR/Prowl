package services

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/checkresult"
	"github.com/ZacharyZcR/STC/backend/ent/competition"
	"github.com/ZacharyZcR/STC/backend/ent/competitionchallenge"
	"github.com/ZacharyZcR/STC/backend/ent/scorerecord"
	"github.com/ZacharyZcR/STC/backend/ent/scoringround"
	"github.com/ZacharyZcR/STC/backend/ent/teamregistration"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type ScoringRoundService struct {
	client     *ent.Client
	checker    *CheckerService
	awdService *AWDService
	logger     *zap.Logger
}

func NewScoringRoundService(client *ent.Client, checker *CheckerService, logger *zap.Logger) *ScoringRoundService {
	return &ScoringRoundService{client: client, checker: checker, logger: logger}
}

func (s *ScoringRoundService) SetAWDService(awd *AWDService) {
	s.awdService = awd
}

func (s *ScoringRoundService) GetClient() *ent.Client {
	return s.client
}

type AWDScoringConfig struct {
	AttackScore  int `json:"attack_score"`
	DefenseScore int `json:"defense_score"`
	CheckScore   int `json:"check_score"`
}

func DefaultAWDConfig() AWDScoringConfig {
	return AWDScoringConfig{
		AttackScore:  50,
		DefenseScore: -50,
		CheckScore:   -30,
	}
}

func (s *ScoringRoundService) ExecuteRound(ctx context.Context, competitionID int) error {
	comp, err := s.client.Competition.Get(ctx, competitionID)
	if err != nil {
		return apperr.ErrNotFound.WithMessage("competition not found")
	}
	if comp.Status != competition.StatusRunning {
		return apperr.ErrBadRequest.WithMessage("competition is not running")
	}
	if comp.Mode != competition.ModeAwd {
		return apperr.ErrBadRequest.WithMessage("competition is not AWD mode")
	}

	lastRound, _ := s.client.ScoringRound.Query().
		Where(scoringround.CompetitionID(competitionID)).
		Order(ent.Desc(scoringround.FieldRoundNumber)).
		First(ctx)

	roundNumber := 1
	if lastRound != nil {
		if lastRound.Status != scoringround.StatusCompleted {
			return apperr.ErrBadRequest.WithMessage("previous round not yet completed")
		}
		roundNumber = lastRound.RoundNumber + 1
	}

	round, err := s.client.ScoringRound.Create().
		SetCompetitionID(competitionID).
		SetRoundNumber(roundNumber).
		SetStatus(scoringround.StatusRunning).
		Save(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to create round: " + err.Error())
	}

	regs, err := s.client.TeamRegistration.Query().
		Where(
			teamregistration.CompetitionID(competitionID),
			teamregistration.StatusEQ(teamregistration.StatusApproved),
		).All(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to get teams: " + err.Error())
	}
	teamIDs := make([]int, 0, len(regs))
	for _, r := range regs {
		teamIDs = append(teamIDs, r.TeamID)
	}

	ccs, err := s.client.CompetitionChallenge.Query().
		Where(competitionchallenge.CompetitionID(competitionID), competitionchallenge.IsVisible(true)).
		All(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to get challenges: " + err.Error())
	}
	challengeIDs := make([]int, 0, len(ccs))
	for _, cc := range ccs {
		challengeIDs = append(challengeIDs, cc.ChallengeID)
	}

	if s.awdService != nil {
		rotated, _ := s.awdService.RotateFlags(ctx, competitionID, roundNumber)
		s.logger.Info("AWD flags rotated", zap.Int("rotated", rotated), zap.Int("round", roundNumber))
	}

	targets, _ := s.checker.BuildTargets(ctx, competitionID, teamIDs, challengeIDs)
	checkResults, _ := s.checker.RunChecks(ctx, round.ID, targets)

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
		if v, ok := comp.ScoringConfig["check_score"]; ok {
			if f, ok := v.(float64); ok {
				awdCfg.CheckScore = int(f)
			}
		}
	}

	chalChecks := make(map[int][]checkresult.Status)
	chalTeams := make(map[int][]int)
	for _, cr := range checkResults {
		st := checkresult.Status(cr.Status)
		chalChecks[cr.ChallengeID] = append(chalChecks[cr.ChallengeID], st)
		chalTeams[cr.ChallengeID] = append(chalTeams[cr.ChallengeID], cr.TeamID)
	}
	for chalID, statuses := range chalChecks {
		teams := chalTeams[chalID]
		var downTeams, upTeams []int
		for i, st := range statuses {
			if st == checkresult.StatusUp {
				upTeams = append(upTeams, teams[i])
			} else {
				downTeams = append(downTeams, teams[i])
			}
		}
		if len(downTeams) == 0 || len(upTeams) == 0 {
			continue
		}
		penalty := awdCfg.CheckScore
		bonus := (-penalty * len(downTeams)) / len(upTeams)
		for _, tid := range downTeams {
			_, _ = s.client.ScoreRecord.Create().
				SetCompetitionID(competitionID).SetTeamID(tid).SetChallengeID(chalID).
				SetRoundID(round.ID).SetScoreType(scorerecord.ScoreTypeAwdCheck).
				SetPoints(penalty).
				SetDetail(fmt.Sprintf("round %d: service down", roundNumber)).
				Save(ctx)
		}
		for _, tid := range upTeams {
			_, _ = s.client.ScoreRecord.Create().
				SetCompetitionID(competitionID).SetTeamID(tid).SetChallengeID(chalID).
				SetRoundID(round.ID).SetScoreType(scorerecord.ScoreTypeAwdCheck).
				SetPoints(bonus).
				SetDetail(fmt.Sprintf("round %d: service up bonus", roundNumber)).
				Save(ctx)
		}
	}

	now := time.Now()
	_, err = s.client.ScoringRound.UpdateOneID(round.ID).
		SetStatus(scoringround.StatusCompleted).
		SetEndedAt(now).
		Save(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to complete round: " + err.Error())
	}

	s.logger.Info("AWD round completed",
		zap.Int("competition_id", competitionID),
		zap.Int("round", roundNumber),
		zap.Int("checks", len(checkResults)),
	)
	return nil
}

func (s *ScoringRoundService) RecordAttack(ctx context.Context, competitionID, attackerTeamID, victimTeamID, challengeID, roundID int, cfg AWDScoringConfig) error {
	_, _ = s.client.ScoreRecord.Create().
		SetCompetitionID(competitionID).
		SetTeamID(attackerTeamID).
		SetChallengeID(challengeID).
		SetRoundID(roundID).
		SetScoreType(scorerecord.ScoreTypeAwdAttack).
		SetPoints(cfg.AttackScore).
		SetDetail(fmt.Sprintf("attacked team %d", victimTeamID)).
		Save(ctx)

	_, _ = s.client.ScoreRecord.Create().
		SetCompetitionID(competitionID).
		SetTeamID(victimTeamID).
		SetChallengeID(challengeID).
		SetRoundID(roundID).
		SetScoreType(scorerecord.ScoreTypeAwdDefense).
		SetPoints(cfg.DefenseScore).
		SetDetail(fmt.Sprintf("pwned by team %d", attackerTeamID)).
		Save(ctx)

	return nil
}

func (s *ScoringRoundService) ListRounds(ctx context.Context, competitionID int) ([]*ent.ScoringRound, error) {
	return s.client.ScoringRound.Query().
		Where(scoringround.CompetitionID(competitionID)).
		Order(ent.Desc(scoringround.FieldRoundNumber)).
		All(ctx)
}

func (s *ScoringRoundService) GetCurrentRound(ctx context.Context, competitionID int) (*ent.ScoringRound, error) {
	return s.client.ScoringRound.Query().
		Where(scoringround.CompetitionID(competitionID)).
		Order(ent.Desc(scoringround.FieldRoundNumber)).
		First(ctx)
}
