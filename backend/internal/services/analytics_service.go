package services

import (
	"context"
	"sort"
	"time"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/challenge"
	"github.com/ZacharyZcR/STC/backend/ent/competitionchallenge"
	"github.com/ZacharyZcR/STC/backend/ent/flagsubmission"
	"github.com/ZacharyZcR/STC/backend/ent/teamregistration"
)

type AnalyticsService struct {
	client *ent.Client
}

func NewAnalyticsService(client *ent.Client) *AnalyticsService {
	return &AnalyticsService{client: client}
}

type CompetitionAnalytics struct {
	CompetitionID       int                  `json:"competition_id"`
	GeneratedAt         string               `json:"generated_at"`
	TotalTeams          int                  `json:"total_teams"`
	TotalChallenges     int                  `json:"total_challenges"`
	TotalSubmissions    int                  `json:"total_submissions"`
	CorrectSubmissions  int                  `json:"correct_submissions"`
	OverallSolveRate    float64              `json:"overall_solve_rate"`
	ChallengeDifficulty []ChallengeDiffStat  `json:"challenge_difficulty"`
	CategoryStats       []CategoryStat       `json:"category_stats"`
	TimeDistribution    []TimeSlot           `json:"time_distribution"`
	TeamProgress        []TeamProgressEntry  `json:"team_progress"`
	FirstBloods         []FirstBloodEntry    `json:"first_bloods"`
}

type ChallengeDiffStat struct {
	ChallengeID   int     `json:"challenge_id"`
	Title         string  `json:"title"`
	Category      string  `json:"category"`
	Difficulty    string  `json:"difficulty"`
	SolveCount    int     `json:"solve_count"`
	TotalTeams    int     `json:"total_teams"`
	SolveRate     float64 `json:"solve_rate"`
	AvgSolveTime  int     `json:"avg_solve_time_mins"`
}

type CategoryStat struct {
	Category       string  `json:"category"`
	ChallengeCount int     `json:"challenge_count"`
	TotalSolves    int     `json:"total_solves"`
	AvgSolveRate   float64 `json:"avg_solve_rate"`
}

type TimeSlot struct {
	Hour       int `json:"hour"`
	Submissions int `json:"submissions"`
	Correct    int `json:"correct"`
}

type TeamProgressEntry struct {
	TeamID     int     `json:"team_id"`
	TeamName   string  `json:"team_name"`
	SolveCount int     `json:"solve_count"`
	TotalScore int     `json:"total_score"`
	Progress   float64 `json:"progress"`
}

type FirstBloodEntry struct {
	ChallengeID   int    `json:"challenge_id"`
	ChallengeName string `json:"challenge_name"`
	TeamID        int    `json:"team_id"`
	TeamName      string `json:"team_name"`
	SolvedAt      string `json:"solved_at"`
}

func (s *AnalyticsService) GetAnalytics(ctx context.Context, competitionID int) (*CompetitionAnalytics, error) {
	analytics := &CompetitionAnalytics{
		CompetitionID: competitionID,
		GeneratedAt:   time.Now().Format("2006-01-02T15:04:05Z"),
	}

	totalTeams, _ := s.client.TeamRegistration.Query().
		Where(teamregistration.CompetitionID(competitionID), teamregistration.StatusEQ(teamregistration.StatusApproved)).
		Count(ctx)
	analytics.TotalTeams = totalTeams

	ccs, _ := s.client.CompetitionChallenge.Query().
		Where(competitionchallenge.CompetitionID(competitionID)).
		All(ctx)
	analytics.TotalChallenges = len(ccs)

	chalIDs := make([]int, 0, len(ccs))
	for _, cc := range ccs {
		chalIDs = append(chalIDs, cc.ChallengeID)
	}

	allSubs, _ := s.client.FlagSubmission.Query().
		Where(flagsubmission.CompetitionID(competitionID)).
		WithChallenge().WithTeam().
		All(ctx)
	analytics.TotalSubmissions = len(allSubs)

	correctSubs := 0
	for _, sub := range allSubs {
		if sub.IsCorrect {
			correctSubs++
		}
	}
	analytics.CorrectSubmissions = correctSubs
	if len(allSubs) > 0 {
		analytics.OverallSolveRate = float64(correctSubs) / float64(len(allSubs))
	}

	if len(chalIDs) > 0 {
		challenges, _ := s.client.Challenge.Query().
			Where(challenge.IDIn(chalIDs...)).
			All(ctx)

		diffStats := make([]ChallengeDiffStat, 0, len(challenges))
		catSolves := make(map[string]struct{ challenges, solves int })

		for _, c := range challenges {
			stat := ChallengeDiffStat{
				ChallengeID: c.ID,
				Title:       c.Title,
				Category:    c.Category,
				Difficulty:  string(c.Difficulty),
				SolveCount:  c.SolveCount,
				TotalTeams:  totalTeams,
			}
			if totalTeams > 0 {
				stat.SolveRate = float64(c.SolveCount) / float64(totalTeams)
			}
			diffStats = append(diffStats, stat)

			cs := catSolves[c.Category]
			cs.challenges++
			cs.solves += c.SolveCount
			catSolves[c.Category] = cs
		}

		sort.Slice(diffStats, func(i, j int) bool {
			return diffStats[i].SolveRate < diffStats[j].SolveRate
		})
		analytics.ChallengeDifficulty = diffStats

		catStats := make([]CategoryStat, 0, len(catSolves))
		for cat, cs := range catSolves {
			avgRate := 0.0
			if totalTeams > 0 && cs.challenges > 0 {
				avgRate = float64(cs.solves) / float64(totalTeams*cs.challenges)
			}
			catStats = append(catStats, CategoryStat{
				Category:       cat,
				ChallengeCount: cs.challenges,
				TotalSolves:    cs.solves,
				AvgSolveRate:   avgRate,
			})
		}
		analytics.CategoryStats = catStats
	}

	timeSlots := make(map[int]struct{ total, correct int })
	for _, sub := range allSubs {
		hour := sub.SubmittedAt.Hour()
		ts := timeSlots[hour]
		ts.total++
		if sub.IsCorrect {
			ts.correct++
		}
		timeSlots[hour] = ts
	}
	timeDist := make([]TimeSlot, 0, 24)
	for h := 0; h < 24; h++ {
		ts := timeSlots[h]
		timeDist = append(timeDist, TimeSlot{Hour: h, Submissions: ts.total, Correct: ts.correct})
	}
	analytics.TimeDistribution = timeDist

	teamSolves := make(map[int]struct {
		name   string
		solves int
		score  int
	})
	for _, sub := range allSubs {
		if !sub.IsCorrect {
			continue
		}
		ts := teamSolves[sub.TeamID]
		if sub.Edges.Team != nil {
			ts.name = sub.Edges.Team.Name
		}
		ts.solves++
		ts.score += sub.PointsAwarded
		teamSolves[sub.TeamID] = ts
	}
	progress := make([]TeamProgressEntry, 0, len(teamSolves))
	for tid, ts := range teamSolves {
		p := 0.0
		if analytics.TotalChallenges > 0 {
			p = float64(ts.solves) / float64(analytics.TotalChallenges)
		}
		progress = append(progress, TeamProgressEntry{
			TeamID: tid, TeamName: ts.name,
			SolveCount: ts.solves, TotalScore: ts.score, Progress: p,
		})
	}
	sort.Slice(progress, func(i, j int) bool { return progress[i].TotalScore > progress[j].TotalScore })
	analytics.TeamProgress = progress

	firstBloods := make([]FirstBloodEntry, 0)
	for _, sub := range allSubs {
		if sub.IsFirstBlood {
			entry := FirstBloodEntry{
				ChallengeID: sub.ChallengeID,
				TeamID:      sub.TeamID,
				SolvedAt:    sub.SubmittedAt.Format("2006-01-02T15:04:05Z"),
			}
			if sub.Edges.Challenge != nil {
				entry.ChallengeName = sub.Edges.Challenge.Title
			}
			if sub.Edges.Team != nil {
				entry.TeamName = sub.Edges.Team.Name
			}
			firstBloods = append(firstBloods, entry)
		}
	}
	analytics.FirstBloods = firstBloods

	return analytics, nil
}
