package services

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/challengeinstance"
	"github.com/ZacharyZcR/STC/backend/ent/competition"
	"github.com/ZacharyZcR/STC/backend/ent/competitionchallenge"
	"github.com/ZacharyZcR/STC/backend/ent/flagsubmission"
	"github.com/ZacharyZcR/STC/backend/ent/scorerecord"
	"github.com/ZacharyZcR/STC/backend/ent/teamregistration"
)

type SummaryService struct {
	client *ent.Client
}

func NewSummaryService(client *ent.Client) *SummaryService {
	return &SummaryService{client: client}
}

type CompetitionSummary struct {
	CompetitionID   int                  `json:"competition_id"`
	Title           string               `json:"title"`
	Mode            string               `json:"mode"`
	Status          string               `json:"status"`
	StartTime       string               `json:"start_time"`
	EndTime         string               `json:"end_time"`
	Duration        string               `json:"duration"`
	TeamCount       int                  `json:"team_count"`
	ChallengeCount  int                  `json:"challenge_count"`
	TotalSubmissions int                 `json:"total_submissions"`
	CorrectSubmissions int              `json:"correct_submissions"`
	Rankings        []RankEntry          `json:"rankings"`
	ChallengeStats  []ChallengeStat      `json:"challenge_stats"`
	Timeline        []TimelinePoint      `json:"timeline"`
	FirstBloods     []FirstBloodEntry    `json:"first_bloods"`
	GeneratedAt     string               `json:"generated_at"`
}

type RankEntry struct {
	Rank       int    `json:"rank"`
	TeamID     int    `json:"team_id"`
	TeamName   string `json:"team_name"`
	TotalScore int    `json:"total_score"`
	SolveCount int    `json:"solve_count"`
	AttackScore  int  `json:"attack_score,omitempty"`
	DefenseScore int  `json:"defense_score,omitempty"`
}

type ChallengeStat struct {
	ChallengeID   int    `json:"challenge_id"`
	Title         string `json:"title"`
	Category      string `json:"category"`
	SolveCount    int    `json:"solve_count"`
	AttemptCount  int    `json:"attempt_count"`
	FirstBloodTeam string `json:"first_blood_team"`
	FirstBloodAt  string `json:"first_blood_at"`
}

type TimelinePoint struct {
	Time   string         `json:"time"`
	Scores map[string]int `json:"scores"`
}


func (s *SummaryService) Generate(ctx context.Context, competitionID int) (*CompetitionSummary, error) {
	comp, err := s.client.Competition.Get(ctx, competitionID)
	if err != nil {
		return nil, err
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

	ccs, _ := s.client.CompetitionChallenge.Query().
		Where(competitionchallenge.CompetitionID(competitionID)).
		WithChallenge().All(ctx)

	subs, _ := s.client.FlagSubmission.Query().
		Where(flagsubmission.CompetitionID(competitionID)).
		Order(ent.Asc(flagsubmission.FieldSubmittedAt)).
		All(ctx)

	scores, _ := s.client.ScoreRecord.Query().
		Where(scorerecord.CompetitionID(competitionID)).
		All(ctx)

	totalSubs := len(subs)
	correctSubs := 0
	for _, sub := range subs {
		if sub.IsCorrect {
			correctSubs++
		}
	}

	// Rankings
	teamScores := make(map[int]int)
	teamSolves := make(map[int]int)
	teamAttack := make(map[int]int)
	teamDefense := make(map[int]int)
	for _, sr := range scores {
		teamScores[sr.TeamID] += sr.Points
		switch sr.ScoreType {
		case scorerecord.ScoreTypeAwdAttack:
			teamAttack[sr.TeamID] += sr.Points
		case scorerecord.ScoreTypeAwdDefense:
			teamDefense[sr.TeamID] += sr.Points
		}
	}
	for _, sub := range subs {
		if sub.IsCorrect {
			teamSolves[sub.TeamID]++
		}
	}

	rankings := make([]RankEntry, 0, len(regs))
	for _, r := range regs {
		if r.Edges.Team == nil {
			continue
		}
		rankings = append(rankings, RankEntry{
			TeamID: r.TeamID, TeamName: r.Edges.Team.Name,
			TotalScore: teamScores[r.TeamID], SolveCount: teamSolves[r.TeamID],
			AttackScore: teamAttack[r.TeamID], DefenseScore: teamDefense[r.TeamID],
		})
	}
	sort.Slice(rankings, func(i, j int) bool {
		return rankings[i].TotalScore > rankings[j].TotalScore
	})
	for i := range rankings {
		rankings[i].Rank = i + 1
	}

	// Challenge stats
	chalStats := make([]ChallengeStat, 0, len(ccs))
	for _, cc := range ccs {
		if cc.Edges.Challenge == nil {
			continue
		}
		chal := cc.Edges.Challenge
		stat := ChallengeStat{
			ChallengeID: chal.ID,
			Title:       chal.Title,
			Category:    chal.Category,
			SolveCount:  chal.SolveCount,
		}
		for _, sub := range subs {
			if sub.ChallengeID == chal.ID {
				stat.AttemptCount++
				if sub.IsCorrect && sub.IsFirstBlood {
					stat.FirstBloodTeam = teamNames[sub.TeamID]
					stat.FirstBloodAt = sub.SubmittedAt.Format("2006-01-02T15:04:05Z")
				}
			}
		}
		chalStats = append(chalStats, stat)
	}

	// First bloods
	firstBloods := make([]FirstBloodEntry, 0)
	for _, sub := range subs {
		if sub.IsFirstBlood {
			chalName := ""
			for _, cc := range ccs {
				if cc.Edges.Challenge != nil && cc.ChallengeID == sub.ChallengeID {
					chalName = cc.Edges.Challenge.Title
				}
			}
			firstBloods = append(firstBloods, FirstBloodEntry{
				ChallengeID: sub.ChallengeID, ChallengeName: chalName,
				TeamID: sub.TeamID, TeamName: teamNames[sub.TeamID],
				SolvedAt: sub.SubmittedAt.Format("2006-01-02T15:04:05Z"),
			})
		}
	}

	// Timeline (score over time, sampled)
	timeline := buildTimeline(scores, teamNames)

	summary := &CompetitionSummary{
		CompetitionID:      competitionID,
		Title:              comp.Title,
		Mode:               string(comp.Mode),
		Status:             string(comp.Status),
		TeamCount:          len(regs),
		ChallengeCount:     len(ccs),
		TotalSubmissions:   totalSubs,
		CorrectSubmissions: correctSubs,
		Rankings:           rankings,
		ChallengeStats:     chalStats,
		Timeline:           timeline,
		FirstBloods:        firstBloods,
		GeneratedAt:        time.Now().Format("2006-01-02T15:04:05Z"),
	}

	if comp.StartTime != nil {
		summary.StartTime = comp.StartTime.Format("2006-01-02T15:04:05Z")
	}
	if comp.EndTime != nil {
		summary.EndTime = comp.EndTime.Format("2006-01-02T15:04:05Z")
	}
	if comp.StartTime != nil && comp.EndTime != nil {
		d := comp.EndTime.Sub(*comp.StartTime)
		h := int(d.Hours())
		m := int(d.Minutes()) % 60
		summary.Duration = fmt.Sprintf("%dh%dm", h, m)
	}

	// Instance stats for AWD
	if comp.Mode == competition.ModeAwd {
		total, _ := s.client.ChallengeInstance.Query().
			Where(challengeinstance.CompetitionID(competitionID)).Count(ctx)
		_ = total
	}

	return summary, nil
}

func buildTimeline(scores []*ent.ScoreRecord, teamNames map[int]string) []TimelinePoint {
	if len(scores) == 0 {
		return nil
	}

	sort.Slice(scores, func(i, j int) bool {
		return scores[i].CreatedAt.Before(scores[j].CreatedAt)
	})

	cumulative := make(map[int]int)
	var points []TimelinePoint

	for _, sr := range scores {
		cumulative[sr.TeamID] += sr.Points
		snapshot := make(map[string]int)
		for tid, total := range cumulative {
			name := teamNames[tid]
			if name == "" {
				name = fmt.Sprintf("team_%d", tid)
			}
			snapshot[name] = total
		}
		points = append(points, TimelinePoint{
			Time:   sr.CreatedAt.Format("2006-01-02T15:04:05Z"),
			Scores: snapshot,
		})
	}

	if len(points) > 100 {
		step := len(points) / 100
		sampled := make([]TimelinePoint, 0, 101)
		for i := 0; i < len(points); i += step {
			sampled = append(sampled, points[i])
		}
		sampled = append(sampled, points[len(points)-1])
		return sampled
	}
	return points
}
