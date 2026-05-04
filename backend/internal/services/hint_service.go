package services

import (
	"context"
	"fmt"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/scorerecord"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/tx"
)

type HintService struct {
	client *ent.Client
}

func NewHintService(client *ent.Client) *HintService {
	return &HintService{client: client}
}

type HintUnlockResult struct {
	HintID  int    `json:"hint_id"`
	Content string `json:"content"`
	Cost    int    `json:"cost"`
}

func (s *HintService) UnlockHint(ctx context.Context, competitionID, challengeID, hintID, teamID int) (*HintUnlockResult, error) {
	hint, err := s.client.ChallengeHint.Get(ctx, hintID)
	if err != nil {
		return nil, apperr.ErrNotFound.WithMessage("hint not found")
	}

	if hint.ChallengeID != challengeID {
		return nil, apperr.ErrBadRequest.WithMessage("hint does not belong to this challenge")
	}

	if hint.Cost > 0 {
		var result *HintUnlockResult
		err := tx.WithTx(ctx, s.client, func(t *ent.Tx) error {
			_, err := t.ScoreRecord.Create().
				SetCompetitionID(competitionID).
				SetTeamID(teamID).
				SetChallengeID(challengeID).
				SetScoreType(scorerecord.ScoreTypeHint).
				SetPoints(-hint.Cost).
				SetDetail(fmt.Sprintf("unlocked hint #%d", hint.ID)).
				Save(ctx)
			if err != nil {
				return apperr.ErrInternal.WithMessage("failed to record hint cost: " + err.Error())
			}
			result = &HintUnlockResult{
				HintID:  hint.ID,
				Content: hint.Content,
				Cost:    hint.Cost,
			}
			return nil
		})
		if err != nil {
			return nil, err
		}
		return result, nil
	}

	return &HintUnlockResult{
		HintID:  hint.ID,
		Content: hint.Content,
		Cost:    0,
	}, nil
}
