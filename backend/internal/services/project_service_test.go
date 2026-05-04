package services

import (
	"context"
	"testing"

	"github.com/ZacharyZcR/STC/backend/ent/activity"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/testutil"
)

func setupProjectTest(t *testing.T) (*ProjectService, context.Context, int, string) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "admin", []string{"*"})
	user := testutil.SeedTestUser(ctx, client, "owner", "pass", role.ID)

	actSvc := NewActivityService(client)
	svc := NewProjectService(client, actSvc)
	return svc, ctx, user.ID, user.Username
}

func TestProjectService_Create(t *testing.T) {
	svc, ctx, ownerID, username := setupProjectTest(t)

	p, err := svc.Create(ctx, &models.CreateProjectRequest{
		Name:        "test-project",
		Description: "a test project",
	}, ownerID, username, "127.0.0.1")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if p.Name != "test-project" {
		t.Fatalf("expected name test-project, got %s", p.Name)
	}
	if p.OwnerID != ownerID {
		t.Fatalf("expected owner_id %d, got %d", ownerID, p.OwnerID)
	}
}

func TestProjectService_List(t *testing.T) {
	svc, ctx, ownerID, username := setupProjectTest(t)

	svc.Create(ctx, &models.CreateProjectRequest{Name: "proj1", Description: "d"}, ownerID, username, "")
	svc.Create(ctx, &models.CreateProjectRequest{Name: "proj2", Description: "d"}, ownerID, username, "")

	result, err := svc.List(ctx, &models.ProjectListQuery{Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Total != 2 {
		t.Fatalf("expected 2 projects, got %d", result.Total)
	}
}

func TestProjectService_List_FilterStatus(t *testing.T) {
	svc, ctx, ownerID, username := setupProjectTest(t)

	svc.Create(ctx, &models.CreateProjectRequest{Name: "active1", Description: "d", Status: "active"}, ownerID, username, "")
	svc.Create(ctx, &models.CreateProjectRequest{Name: "archived1", Description: "d", Status: "archived"}, ownerID, username, "")

	result, err := svc.List(ctx, &models.ProjectListQuery{Page: 1, PageSize: 10, Status: "active"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Total != 1 {
		t.Fatalf("expected 1 active project, got %d", result.Total)
	}
}

func TestProjectService_Update(t *testing.T) {
	svc, ctx, ownerID, username := setupProjectTest(t)

	p, _ := svc.Create(ctx, &models.CreateProjectRequest{Name: "original", Description: "d"}, ownerID, username, "")

	newName := "renamed"
	updated, err := svc.Update(ctx, p.ID, &models.UpdateProjectRequest{Name: &newName}, ownerID, username, "")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if updated.Name != "renamed" {
		t.Fatalf("expected name renamed, got %s", updated.Name)
	}
}

func TestProjectService_Delete(t *testing.T) {
	svc, ctx, ownerID, username := setupProjectTest(t)

	p, _ := svc.Create(ctx, &models.CreateProjectRequest{Name: "to-delete", Description: "d"}, ownerID, username, "")

	err := svc.Delete(ctx, p.ID, ownerID, username, "")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	_, err = svc.GetByID(ctx, p.ID)
	if err == nil {
		t.Fatal("expected error after deletion")
	}
}

func TestProjectService_Delete_NotFound(t *testing.T) {
	svc, ctx, ownerID, username := setupProjectTest(t)

	err := svc.Delete(ctx, 99999, ownerID, username, "")
	if err == nil {
		t.Fatal("expected error for nonexistent project")
	}
}

func TestProjectService_GetByIDWithOwner(t *testing.T) {
	svc, ctx, ownerID, username := setupProjectTest(t)

	p, err := svc.Create(ctx, &models.CreateProjectRequest{Name: "with-owner", Description: "d"}, ownerID, username, "")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	resp, err := svc.GetByIDWithOwner(ctx, p.ID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if resp.OwnerName != username {
		t.Fatalf("expected owner name %s, got %s", username, resp.OwnerName)
	}
}

func TestProjectService_BatchDelete(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "admin", []string{"*"})
	user := testutil.SeedTestUser(ctx, client, "owner", "pass", role.ID)

	actSvc := NewActivityService(client)
	svc := NewProjectService(client, actSvc)

	projectA := testutil.SeedTestProject(ctx, client, "project-a", user.ID)
	projectB := testutil.SeedTestProject(ctx, client, "project-b", user.ID)

	deleted, errs, err := svc.BatchDelete(ctx, []int{projectA.ID, projectB.ID, projectA.ID, 99999}, user.ID, user.Username, "127.0.0.1")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if deleted != 2 {
		t.Fatalf("expected 2 deleted projects, got %d", deleted)
	}
	if len(errs) != 1 || errs[0] != "project 99999 not found" {
		t.Fatalf("expected one missing-project error, got %v", errs)
	}

	count, countErr := client.Project.Query().Count(ctx)
	if countErr != nil {
		t.Fatalf("count projects: %v", countErr)
	}
	if count != 0 {
		t.Fatalf("expected all projects deleted, got %d remaining", count)
	}

	activityCount, activityErr := client.Activity.Query().
		Where(activity.Action("project.delete")).
		Count(ctx)
	if activityErr != nil {
		t.Fatalf("count activity logs: %v", activityErr)
	}
	if activityCount != 2 {
		t.Fatalf("expected 2 delete activity logs, got %d", activityCount)
	}
}

func TestProjectService_Create_RecordsActivity(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "admin", []string{"*"})
	user := testutil.SeedTestUser(ctx, client, "owner", "pass", role.ID)

	actSvc := NewActivityService(client)
	svc := NewProjectService(client, actSvc)

	svc.Create(ctx, &models.CreateProjectRequest{Name: "tracked", Description: "d"}, user.ID, user.Username, "10.0.0.1")

	// Verify activity was logged
	activities, err := actSvc.List(ctx, &models.ActivityListQuery{Page: 1, PageSize: 10, ResourceType: "project"})
	if err != nil {
		t.Fatalf("expected no error listing activities, got %v", err)
	}
	if activities.Total < 1 {
		t.Fatal("expected at least 1 activity record for project creation")
	}
}
