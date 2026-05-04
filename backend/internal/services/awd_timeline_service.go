package services

import (
	"context"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/scorerecord"
	"github.com/ZacharyZcR/STC/backend/ent/scoringround"
	"github.com/ZacharyZcR/STC/backend/ent/teamregistration"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type AWDTimelineService struct {
	client *ent.Client
}

func NewAWDTimelineService(client *ent.Client) *AWDTimelineService {
	return &AWDTimelineService{client: client}
}

type RoundScoreSnapshot struct {
	RoundNumber int              `json:"round_number"`
	Teams       []TeamRoundScore `json:"teams"`
}

type TeamRoundScore struct {
	TeamID     int `json:"team_id"`
	TeamName   string `json:"team_name"`
	RoundScore int `json:"round_score"`
	TotalScore int `json:"total_score"`
	Attack     int `json:"attack"`
	Defense    int `json:"defense"`
	Check      int `json:"check"`
}

func (s *AWDTimelineService) GetTimeline(ctx context.Context, competitionID int) ([]RoundScoreSnapshot, error) {
	rounds, err := s.client.ScoringRound.Query().
		Where(scoringround.CompetitionID(competitionID), scoringround.StatusEQ(scoringround.StatusCompleted)).
		Order(ent.Asc(scoringround.FieldRoundNumber)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to get rounds: " + err.Error())
	}

	regs, _ := s.client.TeamRegistration.Query().
		Where(teamregistration.CompetitionID(competitionID), teamregistration.StatusEQ(teamregistration.StatusApproved)).
		WithTeam().All(ctx)

	teamNames := make(map[int]string)
	for _, r := range regs {
		if r.Edges.Team != nil {
			teamNames[r.TeamID] = r.Edges.Team.Name
		}
	}

	cumulativeScores := make(map[int]int)
	snapshots := make([]RoundScoreSnapshot, 0, len(rounds))

	for _, round := range rounds {
		scores, _ := s.client.ScoreRecord.Query().
			Where(scorerecord.CompetitionID(competitionID), scorerecord.RoundID(round.ID)).
			All(ctx)

		roundTeamScores := make(map[int]*TeamRoundScore)
		for _, r := range regs {
			roundTeamScores[r.TeamID] = &TeamRoundScore{
				TeamID:   r.TeamID,
				TeamName: teamNames[r.TeamID],
			}
		}

		for _, sr := range scores {
			ts := roundTeamScores[sr.TeamID]
			if ts == nil {
				continue
			}
			ts.RoundScore += sr.Points
			switch sr.ScoreType {
			case scorerecord.ScoreTypeAwdAttack:
				ts.Attack += sr.Points
			case scorerecord.ScoreTypeAwdDefense:
				ts.Defense += sr.Points
			case scorerecord.ScoreTypeAwdCheck:
				ts.Check += sr.Points
			}
		}

		teams := make([]TeamRoundScore, 0, len(roundTeamScores))
		for tid, ts := range roundTeamScores {
			cumulativeScores[tid] += ts.RoundScore
			ts.TotalScore = cumulativeScores[tid]
			teams = append(teams, *ts)
		}

		snapshots = append(snapshots, RoundScoreSnapshot{
			RoundNumber: round.RoundNumber,
			Teams:       teams,
		})
	}

	return snapshots, nil
}
