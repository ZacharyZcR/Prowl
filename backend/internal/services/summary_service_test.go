package services

import (
	"context"
	"testing"

	"github.com/ZacharyZcR/STC/backend/ent/competition"
	"github.com/ZacharyZcR/STC/backend/ent/scorerecord"
	"github.com/ZacharyZcR/STC/backend/ent/teamregistration"
	"github.com/ZacharyZcR/STC/backend/internal/testutil"
)

func TestSummaryService_Generate_ExcludesRejectedRegistrations(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "admin", []string{"*"})
	owner := testutil.SeedTestUser(ctx, client, "owner", "pass", role.ID)
	approvedUser := testutil.SeedTestUser(ctx, client, "approved", "pass", role.ID)
	rejectedUser := testutil.SeedTestUser(ctx, client, "rejected", "pass", role.ID)

	comp := client.Competition.Create().
		SetTitle("summary excludes rejected").
		SetMode(competition.ModeCtfJeopardy).
		SetStatus(competition.StatusEnded).
		SetCreatedBy(owner.ID).
		SaveX(ctx)
	approvedTeam := client.Team.Create().
		SetName("approved team").
		SetInviteCode("approved-code").
		SetCaptainID(approvedUser.ID).
		SaveX(ctx)
	rejectedTeam := client.Team.Create().
		SetName("rejected team").
		SetInviteCode("rejected-code").
		SetCaptainID(rejectedUser.ID).
		SaveX(ctx)
	client.TeamRegistration.Create().
		SetCompetitionID(comp.ID).
		SetTeamID(approvedTeam.ID).
		SetStatus(teamregistration.StatusApproved).
		SaveX(ctx)
	client.TeamRegistration.Create().
		SetCompetitionID(comp.ID).
		SetTeamID(rejectedTeam.ID).
		SetStatus(teamregistration.StatusRejected).
		SaveX(ctx)

	approvedChallenge := client.Challenge.Create().
		SetTitle("approved solve").
		SetCategory("Web").
		SetFlagType("static").
		SetAuthorID(owner.ID).
		SaveX(ctx)
	rejectedChallenge := client.Challenge.Create().
		SetTitle("rejected solve").
		SetCategory("Crypto").
		SetFlagType("static").
		SetAuthorID(owner.ID).
		SaveX(ctx)
	client.CompetitionChallenge.Create().
		SetCompetitionID(comp.ID).
		SetChallengeID(approvedChallenge.ID).
		SetIsVisible(true).
		SaveX(ctx)
	client.CompetitionChallenge.Create().
		SetCompetitionID(comp.ID).
		SetChallengeID(rejectedChallenge.ID).
		SetIsVisible(true).
		SaveX(ctx)

	client.FlagSubmission.Create().
		SetCompetitionID(comp.ID).
		SetChallengeID(approvedChallenge.ID).
		SetTeamID(approvedTeam.ID).
		SetUserID(approvedUser.ID).
		SetSubmittedFlag("flag{approved}").
		SetIsCorrect(true).
		SetIsFirstBlood(true).
		SetPointsAwarded(100).
		SaveX(ctx)
	client.FlagSubmission.Create().
		SetCompetitionID(comp.ID).
		SetChallengeID(rejectedChallenge.ID).
		SetTeamID(rejectedTeam.ID).
		SetUserID(rejectedUser.ID).
		SetSubmittedFlag("flag{rejected}").
		SetIsCorrect(true).
		SetIsFirstBlood(true).
		SetPointsAwarded(200).
		SaveX(ctx)
	client.ScoreRecord.Create().
		SetCompetitionID(comp.ID).
		SetTeamID(approvedTeam.ID).
		SetChallengeID(approvedChallenge.ID).
		SetScoreType(scorerecord.ScoreTypeFlagSolve).
		SetPoints(100).
		SaveX(ctx)
	client.ScoreRecord.Create().
		SetCompetitionID(comp.ID).
		SetTeamID(rejectedTeam.ID).
		SetChallengeID(rejectedChallenge.ID).
		SetScoreType(scorerecord.ScoreTypeFlagSolve).
		SetPoints(200).
		SaveX(ctx)

	summary, err := NewSummaryService(client).Generate(ctx, comp.ID)
	if err != nil {
		t.Fatalf("generate summary: %v", err)
	}

	if summary.TeamCount != 1 {
		t.Fatalf("expected 1 approved team, got %d", summary.TeamCount)
	}
	if summary.TotalSubmissions != 1 || summary.CorrectSubmissions != 1 {
		t.Fatalf("expected only approved submissions to count, got total=%d correct=%d", summary.TotalSubmissions, summary.CorrectSubmissions)
	}
	if len(summary.Rankings) != 1 || summary.Rankings[0].TeamID != approvedTeam.ID {
		t.Fatalf("expected only approved team in rankings, got %#v", summary.Rankings)
	}
	if len(summary.FirstBloods) != 1 || summary.FirstBloods[0].TeamID != approvedTeam.ID {
		t.Fatalf("expected rejected first blood to be excluded, got %#v", summary.FirstBloods)
	}
	for _, point := range summary.Timeline {
		if _, exists := point.Scores["rejected team"]; exists {
			t.Fatalf("expected rejected team to be absent from timeline, got %#v", point.Scores)
		}
	}
	for _, stat := range summary.ChallengeStats {
		if stat.ChallengeID == rejectedChallenge.ID && (stat.SolveCount != 0 || stat.AttemptCount != 0 || stat.FirstBloodTeam != "") {
			t.Fatalf("expected rejected challenge stats to ignore rejected team, got %#v", stat)
		}
	}
}
