package services

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"

	"go.uber.org/zap"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/challengeinstance"
	"github.com/ZacharyZcR/STC/backend/ent/checkresult"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type CheckerService struct {
	client     *ent.Client
	httpClient *http.Client
	logger     *zap.Logger
}

func NewCheckerService(client *ent.Client, logger *zap.Logger) *CheckerService {
	return &CheckerService{
		client: client,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		logger: logger,
	}
}

type CheckTarget struct {
	TeamID      int
	ChallengeID int
	AccessURL   string
	CheckType   string // "http" or "tcp"
}

func (s *CheckerService) RunChecks(ctx context.Context, roundID int, targets []CheckTarget) ([]ent.CheckResult, error) {
	results := make([]ent.CheckResult, 0, len(targets))

	for _, target := range targets {
		status, detail := s.check(ctx, target)

		existing, err := s.client.CheckResult.Query().
			Where(
				checkresult.RoundID(roundID),
				checkresult.TeamID(target.TeamID),
				checkresult.ChallengeID(target.ChallengeID),
			).Only(ctx)

		if err == nil {
			updated, err := s.client.CheckResult.UpdateOneID(existing.ID).
				SetStatus(checkresult.Status(status)).
				SetDetail(detail).
				Save(ctx)
			if err == nil {
				results = append(results, *updated)
			}
			continue
		}

		cr, err := s.client.CheckResult.Create().
			SetRoundID(roundID).
			SetTeamID(target.TeamID).
			SetChallengeID(target.ChallengeID).
			SetStatus(checkresult.Status(status)).
			SetDetail(detail).
			Save(ctx)
		if err != nil {
			s.logger.Error("failed to save check result",
				zap.Int("team_id", target.TeamID),
				zap.Int("challenge_id", target.ChallengeID),
				zap.Error(err),
			)
			continue
		}
		results = append(results, *cr)
	}

	return results, nil
}

func (s *CheckerService) check(ctx context.Context, target CheckTarget) (string, string) {
	switch target.CheckType {
	case "tcp":
		return s.checkTCP(ctx, target.AccessURL)
	default:
		return s.checkHTTP(ctx, target.AccessURL)
	}
}

func (s *CheckerService) checkHTTP(ctx context.Context, url string) (string, string) {
	if !strings.HasPrefix(url, "http") {
		url = "http://" + url
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "error", fmt.Sprintf("invalid url: %v", err)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		if ctx.Err() != nil {
			return "timeout", "request timed out"
		}
		return "down", fmt.Sprintf("connection failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 500 {
		return "up", fmt.Sprintf("HTTP %d", resp.StatusCode)
	}
	return "down", fmt.Sprintf("HTTP %d", resp.StatusCode)
}

func (s *CheckerService) checkTCP(_ context.Context, addr string) (string, string) {
	conn, err := net.DialTimeout("tcp", addr, 5*time.Second)
	if err != nil {
		return "down", fmt.Sprintf("tcp connect failed: %v", err)
	}
	conn.Close()
	return "up", "tcp connection ok"
}

func (s *CheckerService) BuildTargets(ctx context.Context, competitionID int, teamIDs []int, challengeIDs []int) ([]CheckTarget, error) {
	targets := make([]CheckTarget, 0)

	for _, teamID := range teamIDs {
		for _, challengeID := range challengeIDs {
			inst, err := s.client.ChallengeInstance.Query().
				Where(
					challengeinstance.CompetitionID(competitionID),
					challengeinstance.TeamID(teamID),
					challengeinstance.ChallengeID(challengeID),
					challengeinstance.StatusEQ(challengeinstance.StatusRunning),
				).First(ctx)
			if err != nil {
				targets = append(targets, CheckTarget{
					TeamID:      teamID,
					ChallengeID: challengeID,
					AccessURL:   "",
					CheckType:   "http",
				})
				continue
			}

			targets = append(targets, CheckTarget{
				TeamID:      teamID,
				ChallengeID: challengeID,
				AccessURL:   inst.AccessURL,
				CheckType:   "http",
			})
		}
	}
	return targets, nil
}

func (s *CheckerService) GetRoundResults(ctx context.Context, roundID int) ([]checkResultEntry, error) {
	results, err := s.client.CheckResult.Query().
		Where(checkresult.RoundID(roundID)).
		WithTeam().
		WithChallenge().
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to get check results: " + err.Error())
	}

	entries := make([]checkResultEntry, 0, len(results))
	for _, r := range results {
		entry := checkResultEntry{
			ID:          r.ID,
			RoundID:     r.RoundID,
			TeamID:      r.TeamID,
			ChallengeID: r.ChallengeID,
			Status:      string(r.Status),
			Detail:      r.Detail,
			CheckedAt:   r.CheckedAt.Format("2006-01-02T15:04:05Z"),
		}
		if r.Edges.Team != nil {
			entry.TeamName = r.Edges.Team.Name
		}
		if r.Edges.Challenge != nil {
			entry.ChallengeName = r.Edges.Challenge.Title
		}
		entries = append(entries, entry)
	}
	return entries, nil
}

type checkResultEntry struct {
	ID            int    `json:"id"`
	RoundID       int    `json:"round_id"`
	TeamID        int    `json:"team_id"`
	TeamName      string `json:"team_name"`
	ChallengeID   int    `json:"challenge_id"`
	ChallengeName string `json:"challenge_name"`
	Status        string `json:"status"`
	Detail        string `json:"detail"`
	CheckedAt     string `json:"checked_at"`
}
