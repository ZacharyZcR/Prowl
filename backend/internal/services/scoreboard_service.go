package services

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/flagsubmission"
	"github.com/ZacharyZcR/STC/backend/ent/scorerecord"
	"github.com/ZacharyZcR/STC/backend/ent/teamregistration"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type ScoreboardService struct {
	client *ent.Client
	rdb    *redis.Client
}

func NewScoreboardService(client *ent.Client, rdb *redis.Client) *ScoreboardService {
	return &ScoreboardService{client: client, rdb: rdb}
}

const scoreboardCacheTTL = 5 * time.Second

func scoreboardKey(competitionID int) string {
	return fmt.Sprintf("scoreboard:%d", competitionID)
}

func (s *ScoreboardService) InvalidateCache(ctx context.Context, competitionID int) {
	if s.rdb != nil {
		s.rdb.Del(ctx, scoreboardKey(competitionID))
	}
}

func (s *ScoreboardService) GetScoreboard(ctx context.Context, competitionID int) (*models.ScoreboardResponse, error) {
	if s.rdb != nil {
		cached, err := s.rdb.Get(ctx, scoreboardKey(competitionID)).Bytes()
		if err == nil {
			var resp models.ScoreboardResponse
			if json.Unmarshal(cached, &resp) == nil {
				return &resp, nil
			}
		}
	}

	comp, err := s.client.Competition.Get(ctx, competitionID)
	if err != nil {
		return nil, apperr.ErrNotFound.WithMessage("competition not found")
	}

	frozen := comp.ScoreboardFreezeAt != nil && time.Now().After(*comp.ScoreboardFreezeAt)
	if frozen {
		frozenKey := scoreboardKey(competitionID) + ":frozen"
		if s.rdb != nil {
			cached, err := s.rdb.Get(ctx, frozenKey).Bytes()
			if err == nil {
				var resp models.ScoreboardResponse
				if json.Unmarshal(cached, &resp) == nil {
					resp.IsFrozen = true
					return &resp, nil
				}
			}
		}
	}

	mode := GetCompetitionMode(s.client, string(comp.Mode))
	resp, err := mode.CalculateScoreboard(ctx, competitionID)
	if err != nil {
		return nil, err
	}
	resp.UpdatedAt = time.Now().Format("2006-01-02T15:04:05Z")

	if frozen {
		resp.IsFrozen = true
		frozenKey := scoreboardKey(competitionID) + ":frozen"
		if s.rdb != nil {
			if data, err := json.Marshal(resp); err == nil {
				s.rdb.SetNX(ctx, frozenKey, data, 0)
			}
		}
	}

	if s.rdb != nil {
		if data, err := json.Marshal(resp); err == nil {
			s.rdb.Set(ctx, scoreboardKey(competitionID), data, scoreboardCacheTTL)
		}
	}

	return resp, nil
}

func (s *ScoreboardService) GetScoreboardDirect(ctx context.Context, competitionID int) (*models.ScoreboardResponse, error) {
	comp, err := s.client.Competition.Get(ctx, competitionID)
	if err != nil {
		return nil, apperr.ErrNotFound.WithMessage("competition not found")
	}

	regs, err := s.client.TeamRegistration.Query().
		Where(
			teamregistration.CompetitionID(competitionID),
			teamregistration.StatusEQ(teamregistration.StatusApproved),
		).
		WithTeam().
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to get registered teams: " + err.Error())
	}

	entries := make([]models.TeamScoreEntry, 0, len(regs))

	for _, reg := range regs {
		if reg.Edges.Team == nil {
			continue
		}
		team := reg.Edges.Team

		scores, _ := s.client.ScoreRecord.Query().
			Where(scorerecord.CompetitionID(competitionID), scorerecord.TeamID(team.ID)).
			All(ctx)

		var totalScore int
		for _, sr := range scores {
			totalScore += sr.Points
		}

		subs, _ := s.client.FlagSubmission.Query().
			Where(
				flagsubmission.CompetitionID(competitionID),
				flagsubmission.TeamID(team.ID),
				flagsubmission.IsCorrect(true),
			).
			Order(ent.Asc(flagsubmission.FieldSubmittedAt)).
			All(ctx)

		solves := make([]models.ChallengeSolve, 0, len(subs))
		var lastSolveAt string
		for _, sub := range subs {
			solves = append(solves, models.ChallengeSolve{
				ChallengeID:  sub.ChallengeID,
				Points:       sub.PointsAwarded,
				IsFirstBlood: sub.IsFirstBlood,
				SolvedAt:     sub.SubmittedAt.Format("2006-01-02T15:04:05Z"),
			})
			lastSolveAt = sub.SubmittedAt.Format("2006-01-02T15:04:05Z")
		}

		entries = append(entries, models.TeamScoreEntry{
			TeamID:      team.ID,
			TeamName:    team.Name,
			TotalScore:  totalScore,
			SolveCount:  len(subs),
			LastSolveAt: lastSolveAt,
			Challenges:  solves,
		})
	}

	sort.Slice(entries, func(i, j int) bool {
		if entries[i].TotalScore != entries[j].TotalScore {
			return entries[i].TotalScore > entries[j].TotalScore
		}
		return entries[i].LastSolveAt < entries[j].LastSolveAt
	})

	for i := range entries {
		entries[i].Rank = i + 1
	}

	return &models.ScoreboardResponse{
		CompetitionID: competitionID,
		Mode:          string(comp.Mode),
		UpdatedAt:     time.Now().Format("2006-01-02T15:04:05Z"),
		Teams:         entries,
	}, nil
}
