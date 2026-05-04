package services

import (
	"context"
	"encoding/json"
	"sort"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/flagsubmission"
	"github.com/ZacharyZcR/STC/backend/ent/scorerecord"
	"github.com/ZacharyZcR/STC/backend/ent/teamregistration"
	"github.com/ZacharyZcR/STC/backend/internal/models"
)

type CompetitionMode interface {
	CalculateScoreboard(ctx context.Context, competitionID int) (*models.ScoreboardResponse, error)
	ValidateConfig(config json.RawMessage) error
}

type CTFJeopardyMode struct {
	client *ent.Client
}

func NewCTFJeopardyMode(client *ent.Client) *CTFJeopardyMode {
	return &CTFJeopardyMode{client: client}
}

func (m *CTFJeopardyMode) ValidateConfig(_ json.RawMessage) error {
	return nil
}

func (m *CTFJeopardyMode) CalculateScoreboard(ctx context.Context, competitionID int) (*models.ScoreboardResponse, error) {
	regs, _ := m.client.TeamRegistration.Query().
		Where(teamregistration.CompetitionID(competitionID), teamregistration.StatusEQ(teamregistration.StatusApproved)).
		WithTeam().All(ctx)

	entries := make([]models.TeamScoreEntry, 0, len(regs))
	for _, reg := range regs {
		if reg.Edges.Team == nil {
			continue
		}
		team := reg.Edges.Team

		scores, _ := m.client.ScoreRecord.Query().
			Where(scorerecord.CompetitionID(competitionID), scorerecord.TeamID(team.ID)).
			All(ctx)

		var total int
		for _, s := range scores {
			total += s.Points
		}

		subs, _ := m.client.FlagSubmission.Query().
			Where(flagsubmission.CompetitionID(competitionID), flagsubmission.TeamID(team.ID), flagsubmission.IsCorrect(true)).
			Order(ent.Asc(flagsubmission.FieldSubmittedAt)).
			All(ctx)

		solves := make([]models.ChallengeSolve, 0, len(subs))
		var lastSolve string
		for _, sub := range subs {
			solves = append(solves, models.ChallengeSolve{
				ChallengeID:  sub.ChallengeID,
				Points:       sub.PointsAwarded,
				IsFirstBlood: sub.IsFirstBlood,
				SolvedAt:     sub.SubmittedAt.Format("2006-01-02T15:04:05Z"),
			})
			lastSolve = sub.SubmittedAt.Format("2006-01-02T15:04:05Z")
		}

		entries = append(entries, models.TeamScoreEntry{
			TeamID:      team.ID,
			TeamName:    team.Name,
			TotalScore:  total,
			SolveCount:  len(subs),
			LastSolveAt: lastSolve,
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
		Mode:          "ctf_jeopardy",
		Teams:         entries,
	}, nil
}

type AWDMode struct {
	client *ent.Client
}

func NewAWDMode(client *ent.Client) *AWDMode {
	return &AWDMode{client: client}
}

func (m *AWDMode) ValidateConfig(_ json.RawMessage) error {
	return nil
}

func (m *AWDMode) CalculateScoreboard(ctx context.Context, competitionID int) (*models.ScoreboardResponse, error) {
	regs, _ := m.client.TeamRegistration.Query().
		Where(teamregistration.CompetitionID(competitionID), teamregistration.StatusEQ(teamregistration.StatusApproved)).
		WithTeam().All(ctx)

	entries := make([]models.TeamScoreEntry, 0, len(regs))
	for _, reg := range regs {
		if reg.Edges.Team == nil {
			continue
		}
		team := reg.Edges.Team

		scores, _ := m.client.ScoreRecord.Query().
			Where(scorerecord.CompetitionID(competitionID), scorerecord.TeamID(team.ID)).
			All(ctx)

		var total, attack, defense, check int
		for _, s := range scores {
			total += s.Points
			switch s.ScoreType {
			case scorerecord.ScoreTypeAwdAttack:
				attack += s.Points
			case scorerecord.ScoreTypeAwdDefense:
				defense += s.Points
			case scorerecord.ScoreTypeAwdCheck:
				check += s.Points
			}
		}


		entries = append(entries, models.TeamScoreEntry{
			TeamID:          team.ID,
			TeamName:        team.Name,
			TotalScore:      total,
			AWDAttackScore:  attack,
			AWDDefenseScore: defense,
			AWDCheckScore:   check,
		})
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].TotalScore > entries[j].TotalScore
	})
	for i := range entries {
		entries[i].Rank = i + 1
	}

	return &models.ScoreboardResponse{
		CompetitionID: competitionID,
		Mode:          "awd",
		Teams:         entries,
	}, nil
}

type RedBlueMode struct {
	client *ent.Client
}

func NewRedBlueMode(client *ent.Client) *RedBlueMode {
	return &RedBlueMode{client: client}
}

func (m *RedBlueMode) ValidateConfig(_ json.RawMessage) error { return nil }

func (m *RedBlueMode) CalculateScoreboard(ctx context.Context, competitionID int) (*models.ScoreboardResponse, error) {
	regs, _ := m.client.TeamRegistration.Query().
		Where(teamregistration.CompetitionID(competitionID), teamregistration.StatusEQ(teamregistration.StatusApproved)).
		WithTeam().All(ctx)

	entries := make([]models.TeamScoreEntry, 0, len(regs))
	for _, reg := range regs {
		if reg.Edges.Team == nil {
			continue
		}
		role := string(reg.TeamRole)
		if role == "judge" || role == "white" {
			continue
		}
		team := reg.Edges.Team

		scores, _ := m.client.ScoreRecord.Query().
			Where(scorerecord.CompetitionID(competitionID), scorerecord.TeamID(team.ID)).
			All(ctx)

		var total int
		for _, s := range scores {
			total += s.Points
		}

		entries = append(entries, models.TeamScoreEntry{
			TeamID:     team.ID,
			TeamName:   team.Name,
			TeamRole:   role,
			TotalScore: total,
		})
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].TotalScore > entries[j].TotalScore
	})
	for i := range entries {
		entries[i].Rank = i + 1
	}

	return &models.ScoreboardResponse{
		CompetitionID: competitionID,
		Mode:          "red_blue",
		Teams:         entries,
	}, nil
}

func GetCompetitionMode(client *ent.Client, mode string) CompetitionMode {
	switch mode {
	case "awd":
		return NewAWDMode(client)
	case "red_blue":
		return NewRedBlueMode(client)
	default:
		return NewCTFJeopardyMode(client)
	}
}
