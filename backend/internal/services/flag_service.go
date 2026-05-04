package services

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math"
	"regexp"
	"time"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/challenge"
	"github.com/ZacharyZcR/STC/backend/ent/challengeinstance"
	"github.com/ZacharyZcR/STC/backend/ent/competition"
	"github.com/ZacharyZcR/STC/backend/ent/competitionchallenge"
	"github.com/ZacharyZcR/STC/backend/ent/flagsubmission"
	"github.com/ZacharyZcR/STC/backend/ent/scorerecord"
	"github.com/ZacharyZcR/STC/backend/ent/teamregistration"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/tx"
)

type FlagService struct {
	client     *ent.Client
	secretKey  string
	scoreboard *ScoreboardService
	sseBroker  *SSEBroadcaster
}

type SSEBroadcaster struct {
	BroadcastFn func(eventType string, data interface{})
}

func (b *SSEBroadcaster) Send(eventType string, data interface{}) {
	if b != nil && b.BroadcastFn != nil {
		b.BroadcastFn(eventType, data)
	}
}

func NewFlagService(client *ent.Client, secretKey string, scoreboard *ScoreboardService, sseBroker *SSEBroadcaster) *FlagService {
	return &FlagService{client: client, secretKey: secretKey, scoreboard: scoreboard, sseBroker: sseBroker}
}

func (s *FlagService) Submit(ctx context.Context, competitionID, teamID, userID int, req *models.SubmitFlagRequest, ip string) (*models.SubmitFlagResponse, error) {
	comp, err := s.client.Competition.Get(ctx, competitionID)
	if err != nil {
		return nil, apperr.ErrNotFound.WithMessage("competition not found")
	}
	if comp.Status != competition.StatusRunning {
		return nil, apperr.ErrBadRequest.WithMessage("competition is not running")
	}

	registered, _ := s.client.TeamRegistration.Query().
		Where(
			teamregistration.CompetitionID(competitionID),
			teamregistration.TeamID(teamID),
			teamregistration.StatusEQ(teamregistration.StatusApproved),
		).Exist(ctx)
	if !registered {
		return nil, apperr.ErrForbidden.WithMessage("team is not registered for this competition")
	}

	if interval := comp.SubmitIntervalSeconds; interval > 0 {
		lastSub, err := s.client.FlagSubmission.Query().
			Where(
				flagsubmission.CompetitionID(competitionID),
				flagsubmission.TeamID(teamID),
			).
			Order(ent.Desc(flagsubmission.FieldSubmittedAt)).
			First(ctx)
		if err == nil && time.Since(lastSub.SubmittedAt) < time.Duration(interval)*time.Second {
			return nil, apperr.ErrBadRequest.WithMessage(fmt.Sprintf("submit too fast, wait %d seconds", interval))
		}
	}

	cc, err := s.client.CompetitionChallenge.Query().
		Where(
			competitionchallenge.CompetitionID(competitionID),
			competitionchallenge.ChallengeID(req.ChallengeID),
			competitionchallenge.IsVisible(true),
		).Only(ctx)
	if err != nil {
		return nil, apperr.ErrNotFound.WithMessage("challenge not found in this competition")
	}
	_ = cc

	alreadySolved, _ := s.client.FlagSubmission.Query().
		Where(
			flagsubmission.CompetitionID(competitionID),
			flagsubmission.ChallengeID(req.ChallengeID),
			flagsubmission.TeamID(teamID),
			flagsubmission.IsCorrect(true),
		).Exist(ctx)
	if alreadySolved {
		return &models.SubmitFlagResponse{
			Correct: false,
			Message: "already solved",
		}, nil
	}

	chal, err := s.client.Challenge.Get(ctx, req.ChallengeID)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to get challenge: " + err.Error())
	}

	correct := s.verifyFlag(ctx, chal, competitionID, teamID, req.Flag)

	var resp models.SubmitFlagResponse
	var isFirstBlood bool
	err = tx.WithTx(ctx, s.client, func(t *ent.Tx) error {
		sub, err := t.FlagSubmission.Create().
			SetCompetitionID(competitionID).
			SetChallengeID(req.ChallengeID).
			SetTeamID(teamID).
			SetUserID(userID).
			SetSubmittedFlag(req.Flag).
			SetIsCorrect(correct).
			SetIP(ip).
			Save(ctx)
		if err != nil {
			return apperr.ErrInternal.WithMessage("failed to save submission: " + err.Error())
		}

		resp.Correct = correct
		if !correct {
			resp.Message = "incorrect flag"
			return nil
		}

		priorSolves, _ := s.client.FlagSubmission.Query().
			Where(
				flagsubmission.CompetitionID(competitionID),
				flagsubmission.ChallengeID(req.ChallengeID),
				flagsubmission.IsCorrect(true),
				flagsubmission.IDNEQ(sub.ID),
			).Count(ctx)
		isFirstBlood = priorSolves == 0

		points := s.calculateScore(ctx, chal, competitionID)
		bloodBonus := bloodBonusRate(priorSolves)
		if bloodBonus > 0 {
			points += int(float64(chal.BaseScore) * bloodBonus)
		}

		if _, err := t.FlagSubmission.UpdateOneID(sub.ID).
			SetPointsAwarded(points).
			SetIsFirstBlood(isFirstBlood).
			Save(ctx); err != nil {
			return apperr.ErrInternal.WithMessage("failed to update submission: " + err.Error())
		}

		scoreType := bloodScoreType(priorSolves)
		if _, err := t.ScoreRecord.Create().
			SetCompetitionID(competitionID).
			SetTeamID(teamID).
			SetChallengeID(req.ChallengeID).
			SetScoreType(scoreType).
			SetPoints(points).
			SetDetail(fmt.Sprintf("solved %s", chal.Title)).
			Save(ctx); err != nil {
			return apperr.ErrInternal.WithMessage("failed to create score record: " + err.Error())
		}

		if _, err := t.Challenge.UpdateOneID(chal.ID).
			SetSolveCount(chal.SolveCount + 1).
			Save(ctx); err != nil {
			return apperr.ErrInternal.WithMessage("failed to update solve count: " + err.Error())
		}

		resp.Points = points
		resp.FirstBlood = isFirstBlood
		resp.Message = "correct"
		return nil
	})
	if err != nil {
		return nil, err
	}

	if resp.Correct {
		if s.scoreboard != nil {
			s.scoreboard.InvalidateCache(ctx, competitionID)
		}
		if s.sseBroker != nil {
			s.sseBroker.Send("scoreboard_update", map[string]interface{}{
				"competition_id": competitionID,
				"team_id":        teamID,
				"challenge_id":   req.ChallengeID,
				"points":         resp.Points,
			})
			if resp.FirstBlood {
				teamName := ""
				if t, err := s.client.Team.Get(ctx, teamID); err == nil {
					teamName = t.Name
				}
				chalName := ""
				if c, err := s.client.Challenge.Get(ctx, req.ChallengeID); err == nil {
					chalName = c.Title
				}
				s.sseBroker.Send("first_blood", map[string]interface{}{
					"competition_id": competitionID,
					"team_id":        teamID,
					"team_name":      teamName,
					"challenge_id":   req.ChallengeID,
					"challenge_name": chalName,
					"points":         resp.Points,
				})
			}
		}
	}

	return &resp, nil
}

func (s *FlagService) ListSubmissions(ctx context.Context, competitionID int, q *models.SubmissionListQuery) (*models.PaginatedResponse, error) {
	query := s.client.FlagSubmission.Query().
		Where(flagsubmission.CompetitionID(competitionID)).
		WithChallenge().
		WithTeam().
		WithUser()

	if q.TeamID > 0 {
		query = query.Where(flagsubmission.TeamID(q.TeamID))
	}
	if q.ChallengeID > 0 {
		query = query.Where(flagsubmission.ChallengeID(q.ChallengeID))
	}
	if q.IsCorrect != nil {
		query = query.Where(flagsubmission.IsCorrect(*q.IsCorrect))
	}

	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 || q.PageSize > 100 {
		q.PageSize = 20
	}

	total, err := query.Count(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count submissions: " + err.Error())
	}

	offset := (q.Page - 1) * q.PageSize
	subs, err := query.
		Limit(q.PageSize).
		Offset(offset).
		Order(ent.Desc(flagsubmission.FieldSubmittedAt)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list submissions: " + err.Error())
	}

	items := make([]models.FlagSubmissionResponse, 0, len(subs))
	for _, sub := range subs {
		item := models.FlagSubmissionResponse{
			ID:            sub.ID,
			CompetitionID: sub.CompetitionID,
			ChallengeID:   sub.ChallengeID,
			TeamID:        sub.TeamID,
			UserID:        sub.UserID,
			SubmittedFlag: sub.SubmittedFlag,
			IsCorrect:     sub.IsCorrect,
			PointsAwarded: sub.PointsAwarded,
			IsFirstBlood:  sub.IsFirstBlood,
			IP:            sub.IP,
			SubmittedAt:   sub.SubmittedAt.Format("2006-01-02T15:04:05Z"),
		}
		if sub.Edges.Challenge != nil {
			item.ChallengeName = sub.Edges.Challenge.Title
		}
		if sub.Edges.Team != nil {
			item.TeamName = sub.Edges.Team.Name
		}
		if sub.Edges.User != nil {
			item.Username = sub.Edges.User.Username
		}
		items = append(items, item)
	}

	return &models.PaginatedResponse{
		Items:      items,
		Total:      total,
		Page:       q.Page,
		PageSize:   q.PageSize,
		TotalPages: int(math.Ceil(float64(total) / float64(q.PageSize))),
	}, nil
}

func (s *FlagService) verifyFlag(ctx context.Context, chal *ent.Challenge, competitionID, teamID int, submitted string) bool {
	switch challenge.FlagType(chal.FlagType) {
	case challenge.FlagTypeStatic:
		return submitted == chal.StaticFlag

	case challenge.FlagTypeDynamicPerTeam:
		expected := GenerateDynamicFlag(chal.ID, teamID, competitionID, s.secretKey)
		if submitted == expected {
			return true
		}
		inst, err := s.client.ChallengeInstance.Query().
			Where(
				challengeinstance.ChallengeID(chal.ID),
				challengeinstance.CompetitionID(competitionID),
				challengeinstance.TeamID(teamID),
			).Only(ctx)
		if err == nil && inst.Flag != "" {
			return submitted == inst.Flag
		}
		return false

	case challenge.FlagTypeDynamicAttachment:
		inst, err := s.client.ChallengeInstance.Query().
			Where(
				challengeinstance.ChallengeID(chal.ID),
				challengeinstance.CompetitionID(competitionID),
				challengeinstance.TeamID(teamID),
			).Only(ctx)
		if err != nil || inst.Flag == "" {
			return false
		}
		return submitted == inst.Flag

	case challenge.FlagTypeRegex:
		if chal.FlagRegex == "" {
			return false
		}
		matched, err := regexp.MatchString(chal.FlagRegex, submitted)
		return err == nil && matched

	default:
		return false
	}
}

func bloodBonusRate(priorSolves int) float64 {
	switch priorSolves {
	case 0:
		return 0.05
	case 1:
		return 0.03
	case 2:
		return 0.01
	default:
		return 0
	}
}

func bloodScoreType(priorSolves int) scorerecord.ScoreType {
	switch priorSolves {
	case 0:
		return scorerecord.ScoreTypeFirstBlood
	case 1:
		return scorerecord.ScoreTypeSecondBlood
	case 2:
		return scorerecord.ScoreTypeThirdBlood
	default:
		return scorerecord.ScoreTypeFlagSolve
	}
}

// GZCTF 指数衰减: f(S, r, d, x) = floor(S × [r + (1-r) × exp((1-x)/d)])
func (s *FlagService) calculateScore(ctx context.Context, chal *ent.Challenge, competitionID int) int {
	S := float64(chal.BaseScore)
	r := float64(chal.MinScore) / S
	d := chal.DecayFactor
	x := float64(chal.SolveCount)
	score := S * (r + (1-r)*math.Exp((1-x)/d))
	return int(math.Max(float64(chal.MinScore), math.Floor(score)))
}

func GenerateDynamicFlag(challengeID, teamID, competitionID int, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(fmt.Sprintf("%d:%d:%d", challengeID, teamID, competitionID)))
	hash := hex.EncodeToString(h.Sum(nil))[:32]
	return fmt.Sprintf("flag{%s}", hash)
}

func FormatTime(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("2006-01-02T15:04:05Z")
}

type SubmissionExportQuery struct {
	CompetitionID int
}

type SubmissionExportRow struct {
	SubmittedAt   string
	TeamName      string
	Username      string
	ChallengeName string
	SubmittedFlag string
	IsCorrect     bool
	PointsAwarded int
	IsFirstBlood  bool
	IP            string
}

func (s *FlagService) ExportSubmissions(ctx context.Context, q *SubmissionExportQuery) ([]SubmissionExportRow, error) {
	subs, err := s.client.FlagSubmission.Query().
		Where(flagsubmission.CompetitionID(q.CompetitionID)).
		WithChallenge().WithTeam().WithUser().
		Order(ent.Asc(flagsubmission.FieldSubmittedAt)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to query submissions: " + err.Error())
	}

	rows := make([]SubmissionExportRow, 0, len(subs))
	for _, sub := range subs {
		row := SubmissionExportRow{
			SubmittedAt:   sub.SubmittedAt.Format("2006-01-02T15:04:05Z"),
			SubmittedFlag: sub.SubmittedFlag,
			IsCorrect:     sub.IsCorrect,
			PointsAwarded: sub.PointsAwarded,
			IsFirstBlood:  sub.IsFirstBlood,
			IP:            sub.IP,
		}
		if sub.Edges.Team != nil {
			row.TeamName = sub.Edges.Team.Name
		}
		if sub.Edges.User != nil {
			row.Username = sub.Edges.User.Username
		}
		if sub.Edges.Challenge != nil {
			row.ChallengeName = sub.Edges.Challenge.Title
		}
		rows = append(rows, row)
	}
	return rows, nil
}
