package services

import (
	"context"
	"testing"

	"github.com/ZacharyZcR/STC/backend/ent/challengetag"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/testutil"
)

func setupChallengeTest(t *testing.T) (*ChallengeService, context.Context, int, string) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "admin", []string{"*"})
	user := testutil.SeedTestUser(ctx, client, "author", "pass", role.ID)

	actSvc := NewActivityService(client)
	svc := NewChallengeService(client, actSvc)
	return svc, ctx, user.ID, user.Username
}

func TestChallengeService_Create_AllowsSharedTags(t *testing.T) {
	svc, ctx, authorID, username := setupChallengeTest(t)

	req := func(title string) *models.CreateChallengeRequest {
		return &models.CreateChallengeRequest{
			Title:       title,
			Description: "shared tag regression",
			Mode:        "ctf_jeopardy",
			Category:    "web",
			Difficulty:  "easy",
			BaseScore:   100,
			MinScore:    50,
			FlagType:    "static",
			StaticFlag:  "flag{shared_tag}",
			Tags:        []string{"web", "easy"},
		}
	}

	first, err := svc.Create(ctx, req("first challenge"), authorID, username, "127.0.0.1")
	if err != nil {
		t.Fatalf("create first challenge: %v", err)
	}
	second, err := svc.Create(ctx, req("second challenge"), authorID, username, "127.0.0.1")
	if err != nil {
		t.Fatalf("create second challenge with same tags: %v", err)
	}

	tag, err := svc.client.ChallengeTag.Query().
		Where(challengetag.Name("web")).
		WithChallenges().
		Only(ctx)
	if err != nil {
		t.Fatalf("query shared tag: %v", err)
	}
	if got := len(tag.Edges.Challenges); got != 2 {
		t.Fatalf("expected shared tag to link 2 challenges, got %d", got)
	}
	if first.ID == second.ID {
		t.Fatalf("expected distinct challenges, got duplicate id %d", first.ID)
	}
}
