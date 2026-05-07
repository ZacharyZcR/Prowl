package services

import (
	"context"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/challengeinstance"
	"github.com/ZacharyZcR/STC/backend/ent/checkresult"
	"github.com/ZacharyZcR/STC/backend/ent/competition"
	"github.com/ZacharyZcR/STC/backend/ent/competitionchallenge"
	"github.com/ZacharyZcR/STC/backend/ent/flagsubmission"
	"github.com/ZacharyZcR/STC/backend/ent/scorerecord"
	"github.com/ZacharyZcR/STC/backend/ent/scoringround"
	"github.com/ZacharyZcR/STC/backend/ent/teamregistration"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type AntiCheatService struct {
	client *ent.Client
}

func NewAntiCheatService(client *ent.Client) *AntiCheatService {
	return &AntiCheatService{client: client}
}

type AntiCheatReport struct {
	CompetitionID    int               `json:"competition_id"`
	Mode             string            `json:"mode"`
	GeneratedAt      string            `json:"generated_at"`
	CrossFlagAlerts  []CrossFlagAlert  `json:"cross_flag_alerts"`
	IPCorrelations   []IPCorrelation   `json:"ip_correlations"`
	RapidSubmissions []RapidSubmission `json:"rapid_submissions"`
	SubmissionStats  []TeamSubmitStats `json:"submission_stats"`
	AWDAudit         AWDAuditReport    `json:"awd_audit"`
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
	TeamID       int     `json:"team_id"`
	TeamName     string  `json:"team_name"`
	TotalSubmits int     `json:"total_submits"`
	CorrectCount int     `json:"correct_count"`
	WrongCount   int     `json:"wrong_count"`
	SuccessRate  float64 `json:"success_rate"`
}

type AWDAuditReport struct {
	AttackEdges           []AWDAttackEdge        `json:"attack_edges"`
	ServiceIncidents      []AWDServiceIncident   `json:"service_incidents"`
	RestartEvents         []AWDRestartEvent      `json:"restart_events"`
	TeamAttackStats       []AWDTeamAttackStats   `json:"team_attack_stats"`
	SuspiciousSubmissions []AWDSuspiciousPattern `json:"suspicious_submissions"`
}

type AWDAttackEdge struct {
	RoundNumber      int    `json:"round_number"`
	AttackerTeamID   int    `json:"attacker_team_id"`
	AttackerTeamName string `json:"attacker_team_name"`
	VictimTeamID     int    `json:"victim_team_id"`
	VictimTeamName   string `json:"victim_team_name"`
	ChallengeID      int    `json:"challenge_id"`
	ChallengeName    string `json:"challenge_name"`
	Points           int    `json:"points"`
	CreatedAt        string `json:"created_at"`
}

type AWDServiceIncident struct {
	RoundNumber   int    `json:"round_number"`
	TeamID        int    `json:"team_id"`
	TeamName      string `json:"team_name"`
	ChallengeID   int    `json:"challenge_id"`
	ChallengeName string `json:"challenge_name"`
	Status        string `json:"status"`
	Detail        string `json:"detail"`
	CheckedAt     string `json:"checked_at"`
}

type AWDRestartEvent struct {
	RoundNumber   int    `json:"round_number"`
	TeamID        int    `json:"team_id"`
	TeamName      string `json:"team_name"`
	ChallengeID   int    `json:"challenge_id"`
	ChallengeName string `json:"challenge_name"`
	Points        int    `json:"points"`
	Detail        string `json:"detail"`
	CreatedAt     string `json:"created_at"`
}

type AWDTeamAttackStats struct {
	TeamID         int    `json:"team_id"`
	TeamName       string `json:"team_name"`
	Attacks        int    `json:"attacks"`
	Compromised    int    `json:"compromised"`
	ServicesDown   int    `json:"services_down"`
	Restarts       int    `json:"restarts"`
	WrongSubmits   int    `json:"wrong_submits"`
	AttackPoints   int    `json:"attack_points"`
	DefensePoints  int    `json:"defense_points"`
	CheckPoints    int    `json:"check_points"`
	RestartPenalty int    `json:"restart_penalty"`
}

type AWDSuspiciousPattern struct {
	TeamID     int    `json:"team_id"`
	TeamName   string `json:"team_name"`
	Signal     string `json:"signal"`
	Count      int    `json:"count"`
	Detail     string `json:"detail"`
	ObservedAt string `json:"observed_at"`
}

var attackDetailRe = regexp.MustCompile(`attacked team (\d+) on challenge (\d+)`)

func (s *AntiCheatService) GenerateReport(ctx context.Context, competitionID int) (*AntiCheatReport, error) {
	comp, err := s.client.Competition.Get(ctx, competitionID)
	if err != nil {
		return nil, apperr.ErrNotFound.WithMessage("competition not found")
	}

	report := &AntiCheatReport{
		CompetitionID: competitionID,
		Mode:          string(comp.Mode),
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

	if comp.Mode == competition.ModeAwd {
		report.AWDAudit = s.detectAWDSignals(ctx, competitionID)
	}

	return report, nil
}

func (s *AntiCheatService) detectAWDSignals(ctx context.Context, competitionID int) AWDAuditReport {
	report := AWDAuditReport{}
	teamNames, challengeNames, roundNumbers := s.awdAuditNames(ctx, competitionID)

	report.AttackEdges = s.awdAttackEdges(ctx, competitionID, teamNames, challengeNames, roundNumbers)
	report.ServiceIncidents = s.awdServiceIncidents(ctx, competitionID, teamNames, challengeNames, roundNumbers)
	report.RestartEvents = s.awdRestartEvents(ctx, competitionID, teamNames, challengeNames, roundNumbers)
	report.TeamAttackStats = s.awdTeamStats(ctx, competitionID, teamNames, report.AttackEdges, report.ServiceIncidents, report.RestartEvents)
	report.SuspiciousSubmissions = s.awdSuspiciousSubmissions(ctx, competitionID, teamNames)
	return report
}

func (s *AntiCheatService) awdAuditNames(ctx context.Context, competitionID int) (map[int]string, map[int]string, map[int]int) {
	teamNames := make(map[int]string)
	challengeNames := make(map[int]string)
	roundNumbers := make(map[int]int)

	regs, _ := s.client.TeamRegistration.Query().
		Where(teamregistration.CompetitionID(competitionID)).
		WithTeam().
		All(ctx)
	for _, reg := range regs {
		if reg.Edges.Team != nil {
			teamNames[reg.TeamID] = reg.Edges.Team.Name
		}
	}

	ccs, _ := s.client.CompetitionChallenge.Query().
		Where(competitionchallenge.CompetitionID(competitionID)).
		WithChallenge().
		All(ctx)
	for _, cc := range ccs {
		if cc.Edges.Challenge != nil {
			challengeNames[cc.ChallengeID] = cc.Edges.Challenge.Title
		}
	}

	rounds, _ := s.client.ScoringRound.Query().
		Where(scoringround.CompetitionID(competitionID)).
		All(ctx)
	for _, round := range rounds {
		roundNumbers[round.ID] = round.RoundNumber
	}

	return teamNames, challengeNames, roundNumbers
}

func (s *AntiCheatService) awdAttackEdges(ctx context.Context, competitionID int, teamNames, challengeNames map[int]string, roundNumbers map[int]int) []AWDAttackEdge {
	records, err := s.client.ScoreRecord.Query().
		Where(
			scorerecord.CompetitionID(competitionID),
			scorerecord.ScoreTypeEQ(scorerecord.ScoreTypeAwdAttack),
		).
		Order(ent.Desc(scorerecord.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil
	}

	edges := make([]AWDAttackEdge, 0, len(records))
	for _, record := range records {
		matches := attackDetailRe.FindStringSubmatch(record.Detail)
		if len(matches) != 3 {
			continue
		}
		victimID := atoiDefault(matches[1], 0)
		challengeID := atoiDefault(matches[2], intValue(record.ChallengeID))
		edges = append(edges, AWDAttackEdge{
			RoundNumber:      roundNumbers[intValue(record.RoundID)],
			AttackerTeamID:   record.TeamID,
			AttackerTeamName: teamNames[record.TeamID],
			VictimTeamID:     victimID,
			VictimTeamName:   teamNames[victimID],
			ChallengeID:      challengeID,
			ChallengeName:    challengeNames[challengeID],
			Points:           record.Points,
			CreatedAt:        record.CreatedAt.Format("2006-01-02T15:04:05Z"),
		})
	}
	return edges
}

func (s *AntiCheatService) awdServiceIncidents(ctx context.Context, competitionID int, teamNames, challengeNames map[int]string, roundNumbers map[int]int) []AWDServiceIncident {
	rounds, err := s.client.ScoringRound.Query().
		Where(scoringround.CompetitionID(competitionID)).
		IDs(ctx)
	if err != nil || len(rounds) == 0 {
		return nil
	}

	results, err := s.client.CheckResult.Query().
		Where(
			checkresult.RoundIDIn(rounds...),
			checkresult.StatusNEQ(checkresult.StatusUp),
		).
		Order(ent.Desc(checkresult.FieldCheckedAt)).
		All(ctx)
	if err != nil {
		return nil
	}

	incidents := make([]AWDServiceIncident, 0, len(results))
	for _, result := range results {
		incidents = append(incidents, AWDServiceIncident{
			RoundNumber:   roundNumbers[result.RoundID],
			TeamID:        result.TeamID,
			TeamName:      teamNames[result.TeamID],
			ChallengeID:   result.ChallengeID,
			ChallengeName: challengeNames[result.ChallengeID],
			Status:        string(result.Status),
			Detail:        result.Detail,
			CheckedAt:     result.CheckedAt.Format("2006-01-02T15:04:05Z"),
		})
	}
	return incidents
}

func (s *AntiCheatService) awdRestartEvents(ctx context.Context, competitionID int, teamNames, challengeNames map[int]string, roundNumbers map[int]int) []AWDRestartEvent {
	records, err := s.client.ScoreRecord.Query().
		Where(
			scorerecord.CompetitionID(competitionID),
			scorerecord.ScoreTypeEQ(scorerecord.ScoreTypePenalty),
			scorerecord.DetailContains("paid restart"),
		).
		Order(ent.Desc(scorerecord.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil
	}

	events := make([]AWDRestartEvent, 0, len(records))
	for _, record := range records {
		events = append(events, AWDRestartEvent{
			RoundNumber:   roundNumbers[intValue(record.RoundID)],
			TeamID:        record.TeamID,
			TeamName:      teamNames[record.TeamID],
			ChallengeID:   intValue(record.ChallengeID),
			ChallengeName: challengeNames[intValue(record.ChallengeID)],
			Points:        record.Points,
			Detail:        record.Detail,
			CreatedAt:     record.CreatedAt.Format("2006-01-02T15:04:05Z"),
		})
	}
	return events
}

func (s *AntiCheatService) awdTeamStats(ctx context.Context, competitionID int, teamNames map[int]string, attacks []AWDAttackEdge, incidents []AWDServiceIncident, restarts []AWDRestartEvent) []AWDTeamAttackStats {
	stats := make(map[int]*AWDTeamAttackStats)
	for teamID, name := range teamNames {
		stats[teamID] = &AWDTeamAttackStats{TeamID: teamID, TeamName: name}
	}

	for _, attack := range attacks {
		attacker := ensureAWDStat(stats, attack.AttackerTeamID, attack.AttackerTeamName)
		attacker.Attacks++
		attacker.AttackPoints += attack.Points
		ensureAWDStat(stats, attack.VictimTeamID, attack.VictimTeamName).Compromised++
	}
	for _, incident := range incidents {
		ensureAWDStat(stats, incident.TeamID, incident.TeamName).ServicesDown++
	}
	for _, restart := range restarts {
		stat := ensureAWDStat(stats, restart.TeamID, restart.TeamName)
		stat.Restarts++
		stat.RestartPenalty += restart.Points
	}

	records, _ := s.client.ScoreRecord.Query().
		Where(scorerecord.CompetitionID(competitionID)).
		All(ctx)
	for _, record := range records {
		stat := ensureAWDStat(stats, record.TeamID, teamNames[record.TeamID])
		switch record.ScoreType {
		case scorerecord.ScoreTypeAwdDefense:
			stat.DefensePoints += record.Points
		case scorerecord.ScoreTypeAwdCheck:
			stat.CheckPoints += record.Points
		}
	}

	subs, _ := s.client.FlagSubmission.Query().
		Where(flagsubmission.CompetitionID(competitionID), flagsubmission.IsCorrect(false)).
		All(ctx)
	for _, sub := range subs {
		ensureAWDStat(stats, sub.TeamID, teamNames[sub.TeamID]).WrongSubmits++
	}

	result := make([]AWDTeamAttackStats, 0, len(stats))
	for _, stat := range stats {
		result = append(result, *stat)
	}
	sort.Slice(result, func(i, j int) bool {
		left := result[i].AttackPoints + result[i].DefensePoints + result[i].CheckPoints + result[i].RestartPenalty
		right := result[j].AttackPoints + result[j].DefensePoints + result[j].CheckPoints + result[j].RestartPenalty
		return left > right
	})
	return result
}

func (s *AntiCheatService) awdSuspiciousSubmissions(ctx context.Context, competitionID int, teamNames map[int]string) []AWDSuspiciousPattern {
	subs, err := s.client.FlagSubmission.Query().
		Where(flagsubmission.CompetitionID(competitionID)).
		Order(ent.Asc(flagsubmission.FieldSubmittedAt)).
		All(ctx)
	if err != nil {
		return nil
	}

	wrongByTeam := make(map[int]int)
	firstSeen := make(map[int]time.Time)
	for _, sub := range subs {
		if sub.IsCorrect {
			continue
		}
		wrongByTeam[sub.TeamID]++
		if firstSeen[sub.TeamID].IsZero() {
			firstSeen[sub.TeamID] = sub.SubmittedAt
		}
	}

	patterns := make([]AWDSuspiciousPattern, 0)
	for teamID, count := range wrongByTeam {
		if count < 3 {
			continue
		}
		patterns = append(patterns, AWDSuspiciousPattern{
			TeamID:     teamID,
			TeamName:   teamNames[teamID],
			Signal:     "wrong_flag_burst",
			Count:      count,
			Detail:     fmt.Sprintf("短时间内出现 %d 次错误 AWD Flag 提交", count),
			ObservedAt: firstSeen[teamID].Format("2006-01-02T15:04:05Z"),
		})
	}
	return patterns
}

func ensureAWDStat(stats map[int]*AWDTeamAttackStats, teamID int, teamName string) *AWDTeamAttackStats {
	if stats[teamID] == nil {
		stats[teamID] = &AWDTeamAttackStats{TeamID: teamID, TeamName: teamName}
	}
	return stats[teamID]
}

func atoiDefault(raw string, fallback int) int {
	var value int
	if _, err := fmt.Sscanf(raw, "%d", &value); err != nil {
		return fallback
	}
	return value
}

func intValue(value *int) int {
	if value == nil {
		return 0
	}
	return *value
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

	type flagOwner struct {
		teamID   int
		teamName string
	}
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
