package services

import (
	"context"
	"strings"
	"time"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/challengeinstance"
	"github.com/ZacharyZcR/STC/backend/ent/flagsubmission"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type AntiCheatService struct {
	client *ent.Client
}

func NewAntiCheatService(client *ent.Client) *AntiCheatService {
	return &AntiCheatService{client: client}
}

type AntiCheatReport struct {
	CompetitionID      int                `json:"competition_id"`
	GeneratedAt        string             `json:"generated_at"`
	CrossFlagAlerts    []CrossFlagAlert   `json:"cross_flag_alerts"`
	IPCorrelations     []IPCorrelation    `json:"ip_correlations"`
	RapidSubmissions   []RapidSubmission  `json:"rapid_submissions"`
	SubmissionStats    []TeamSubmitStats  `json:"submission_stats"`
}

type CrossFlagAlert struct {
	SubmitterTeamID   int    `json:"submitter_team_id"`
	SubmitterTeamName string `json:"submitter_team_name"`
	VictimTeamID      int    `json:"victim_team_id"`
	VictimTeamName    string `json:"victim_team_name"`
	ChallengeID       int    `json:"challenge_id"`
	ChallengeName     string `json:"challenge_name"`
	SubmittedFlag     string `json:"submitted_flag"`
	SubmittedAt       string `json:"submitted_at"`
}

type IPCorrelation struct {
	IP        string   `json:"ip"`
	TeamIDs   []int    `json:"team_ids"`
	TeamNames []string `json:"team_names"`
	Count     int      `json:"count"`
}

type RapidSubmission struct {
	ChallengeID   int    `json:"challenge_id"`
	ChallengeName string `json:"challenge_name"`
	TeamAID       int    `json:"team_a_id"`
	TeamAName     string `json:"team_a_name"`
	TeamBID       int    `json:"team_b_id"`
	TeamBName     string `json:"team_b_name"`
	TimeDiffSecs  int    `json:"time_diff_secs"`
	SolvedAtA     string `json:"solved_at_a"`
	SolvedAtB     string `json:"solved_at_b"`
}

type TeamSubmitStats struct {
	TeamID        int    `json:"team_id"`
	TeamName      string `json:"team_name"`
	TotalSubmits  int    `json:"total_submits"`
	CorrectCount  int    `json:"correct_count"`
	WrongCount    int    `json:"wrong_count"`
	SuccessRate   float64 `json:"success_rate"`
}

func (s *AntiCheatService) GenerateReport(ctx context.Context, competitionID int) (*AntiCheatReport, error) {
	report := &AntiCheatReport{
		CompetitionID: competitionID,
		GeneratedAt:   time.Now().Format("2006-01-02T15:04:05Z"),
	}

	crossFlags, err := s.detectCrossFlags(ctx, competitionID)
	if err == nil {
		report.CrossFlagAlerts = crossFlags
	}

	ipCorr, err := s.detectIPCorrelation(ctx, competitionID)
	if err == nil {
		report.IPCorrelations = ipCorr
	}

	rapid, err := s.detectRapidSubmissions(ctx, competitionID)
	if err == nil {
		report.RapidSubmissions = rapid
	}

	stats, err := s.getSubmissionStats(ctx, competitionID)
	if err == nil {
		report.SubmissionStats = stats
	}

	return report, nil
}

func (s *AntiCheatService) detectCrossFlags(ctx context.Context, competitionID int) ([]CrossFlagAlert, error) {
	subs, err := s.client.FlagSubmission.Query().
		Where(
			flagsubmission.CompetitionID(competitionID),
			flagsubmission.IsCorrect(false),
		).
		WithTeam().WithChallenge().
		All(ctx)
	if err != nil {
		return nil, err
	}

	instances, err := s.client.ChallengeInstance.Query().
		Where(challengeinstance.CompetitionID(competitionID)).
		WithTeam().
		All(ctx)
	if err != nil {
		return nil, err
	}

	type flagOwner struct{ teamID int; teamName string }
	exactMap := make(map[string]flagOwner)
	leetMap := make(map[string]flagOwner)
	for _, inst := range instances {
		if inst.Flag != "" && inst.Edges.Team != nil {
			owner := flagOwner{inst.TeamID, inst.Edges.Team.Name}
			exactMap[inst.Flag] = owner
			leetMap[normalizeLeet(inst.Flag)] = owner
		}
	}

	alerts := make([]CrossFlagAlert, 0)
	for _, sub := range subs {
		owner, exact := exactMap[sub.SubmittedFlag]
		if !exact {
			owner, exact = leetMap[normalizeLeet(sub.SubmittedFlag)]
		}
		if exact {
			if owner.teamID != sub.TeamID {
				alert := CrossFlagAlert{
					SubmitterTeamID: sub.TeamID,
					VictimTeamID:    owner.teamID,
					VictimTeamName:  owner.teamName,
					ChallengeID:     sub.ChallengeID,
					SubmittedFlag:   sub.SubmittedFlag,
					SubmittedAt:     sub.SubmittedAt.Format("2006-01-02T15:04:05Z"),
				}
				if sub.Edges.Team != nil {
					alert.SubmitterTeamName = sub.Edges.Team.Name
				}
				if sub.Edges.Challenge != nil {
					alert.ChallengeName = sub.Edges.Challenge.Title
				}
				alerts = append(alerts, alert)
			}
		}
	}
	return alerts, nil
}

func (s *AntiCheatService) detectIPCorrelation(ctx context.Context, competitionID int) ([]IPCorrelation, error) {
	subs, err := s.client.FlagSubmission.Query().
		Where(
			flagsubmission.CompetitionID(competitionID),
			flagsubmission.IsCorrect(true),
		).
		WithTeam().
		All(ctx)
	if err != nil {
		return nil, err
	}

	ipTeams := make(map[string]map[int]string)
	for _, sub := range subs {
		if sub.IP == "" {
			continue
		}
		if ipTeams[sub.IP] == nil {
			ipTeams[sub.IP] = make(map[int]string)
		}
		teamName := ""
		if sub.Edges.Team != nil {
			teamName = sub.Edges.Team.Name
		}
		ipTeams[sub.IP][sub.TeamID] = teamName
	}

	correlations := make([]IPCorrelation, 0)
	for ip, teams := range ipTeams {
		if len(teams) <= 1 {
			continue
		}
		corr := IPCorrelation{IP: ip, Count: len(teams)}
		for tid, name := range teams {
			corr.TeamIDs = append(corr.TeamIDs, tid)
			corr.TeamNames = append(corr.TeamNames, name)
		}
		correlations = append(correlations, corr)
	}
	return correlations, nil
}

func (s *AntiCheatService) detectRapidSubmissions(ctx context.Context, competitionID int) ([]RapidSubmission, error) {
	subs, err := s.client.FlagSubmission.Query().
		Where(
			flagsubmission.CompetitionID(competitionID),
			flagsubmission.IsCorrect(true),
		).
		WithTeam().WithChallenge().
		Order(ent.Asc(flagsubmission.FieldSubmittedAt)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	type solveKey struct{ challengeID, teamID int }
	solves := make(map[int][]struct {
		teamID   int
		teamName string
		time     time.Time
	})

	for _, sub := range subs {
		teamName := ""
		if sub.Edges.Team != nil {
			teamName = sub.Edges.Team.Name
		}
		solves[sub.ChallengeID] = append(solves[sub.ChallengeID], struct {
			teamID   int
			teamName string
			time     time.Time
		}{sub.TeamID, teamName, sub.SubmittedAt})
	}

	rapid := make([]RapidSubmission, 0)
	for chalID, ss := range solves {
		for i := 0; i < len(ss)-1; i++ {
			for j := i + 1; j < len(ss); j++ {
				diff := ss[j].time.Sub(ss[i].time)
				if diff < 0 {
					diff = -diff
				}
				if diff <= 3*time.Second && ss[i].teamID != ss[j].teamID {
					chalName := ""
					for _, sub := range subs {
						if sub.ChallengeID == chalID && sub.Edges.Challenge != nil {
							chalName = sub.Edges.Challenge.Title
							break
						}
					}
					rapid = append(rapid, RapidSubmission{
						ChallengeID:   chalID,
						ChallengeName: chalName,
						TeamAID:       ss[i].teamID,
						TeamAName:     ss[i].teamName,
						TeamBID:       ss[j].teamID,
						TeamBName:     ss[j].teamName,
						TimeDiffSecs:  int(diff.Seconds()),
						SolvedAtA:     ss[i].time.Format("2006-01-02T15:04:05Z"),
						SolvedAtB:     ss[j].time.Format("2006-01-02T15:04:05Z"),
					})
				}
			}
		}
	}
	return rapid, nil
}

func (s *AntiCheatService) getSubmissionStats(ctx context.Context, competitionID int) ([]TeamSubmitStats, error) {
	subs, err := s.client.FlagSubmission.Query().
		Where(flagsubmission.CompetitionID(competitionID)).
		WithTeam().
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to query submissions: " + err.Error())
	}

	teamStats := make(map[int]*TeamSubmitStats)
	for _, sub := range subs {
		stat, ok := teamStats[sub.TeamID]
		if !ok {
			name := ""
			if sub.Edges.Team != nil {
				name = sub.Edges.Team.Name
			}
			stat = &TeamSubmitStats{TeamID: sub.TeamID, TeamName: name}
			teamStats[sub.TeamID] = stat
		}
		stat.TotalSubmits++
		if sub.IsCorrect {
			stat.CorrectCount++
		} else {
			stat.WrongCount++
		}
	}

	result := make([]TeamSubmitStats, 0, len(teamStats))
	for _, stat := range teamStats {
		if stat.TotalSubmits > 0 {
			stat.SuccessRate = float64(stat.CorrectCount) / float64(stat.TotalSubmits)
		}
		result = append(result, *stat)
	}
	return result, nil
}

var leetReplacer = strings.NewReplacer(
	"0", "o", "1", "l", "3", "e", "4", "a", "5", "s",
	"7", "t", "@", "a", "!", "i", "$", "s", "+", "t",
)

func normalizeLeet(s string) string {
	return leetReplacer.Replace(strings.ToLower(s))
}
