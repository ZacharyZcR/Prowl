package services

import (
	"context"
	"testing"
	"time"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/testutil"
)

func setupCompetitionTest(t *testing.T) (*CompetitionService, context.Context, int, string) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "admin", []string{"*"})
	user := testutil.SeedTestUser(ctx, client, "owner", "pass", role.ID)

	actSvc := NewActivityService(client)
	svc := NewCompetitionService(client, actSvc)
	return svc, ctx, user.ID, user.Username
}

func TestCompetitionService_Create_AllowsZeroSubmitInterval(t *testing.T) {
	svc, ctx, ownerID, username := setupCompetitionTest(t)
	start := time.Now().UTC().Add(-time.Minute).Format(time.RFC3339)
	end := time.Now().UTC().Add(time.Hour).Format(time.RFC3339)
	zero := 0

	comp, err := svc.Create(ctx, &models.CreateCompetitionRequest{
		Title:                 "zero interval",
		Mode:                  "ctf_jeopardy",
		StartTime:             &start,
		EndTime:               &end,
		IsPublic:              true,
		SubmitIntervalSeconds: &zero,
	}, ownerID, username, "127.0.0.1")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if comp.SubmitIntervalSeconds != 0 {
		t.Fatalf("expected submit interval 0, got %d", comp.SubmitIntervalSeconds)
	}
}
