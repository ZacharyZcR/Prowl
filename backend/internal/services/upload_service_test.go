package services

import (
	"context"
	"testing"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/testutil"
)

func TestUploadServiceList_RestrictsToUploader(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "uploader", []string{"upload:create"})
	owner := testutil.SeedTestUser(ctx, client, "owner", "password123", role.ID)
	other := testutil.SeedTestUser(ctx, client, "other", "password123", role.ID)

	svc := NewUploadService(t.TempDir(), client)
	if _, err := svc.SaveGeneratedFile(ctx, "owner.csv", []byte("owner"), "text/csv", owner.ID, owner.Username); err != nil {
		t.Fatalf("save owner file: %v", err)
	}
	if _, err := svc.SaveGeneratedFile(ctx, "other.csv", []byte("other"), "text/csv", other.ID, other.Username); err != nil {
		t.Fatalf("save other file: %v", err)
	}

	result, err := svc.List(ctx, &models.FileListQuery{Page: 1, PageSize: 20}, owner.ID, false)
	if err != nil {
		t.Fatalf("list files: %v", err)
	}
	if result.Total != 1 {
		t.Fatalf("expected 1 visible file, got %d", result.Total)
	}

	items, ok := result.Items.([]models.FileResponse)
	if !ok {
		t.Fatalf("expected []models.FileResponse, got %T", result.Items)
	}
	if len(items) != 1 || items[0].UploaderID != owner.ID {
		t.Fatalf("expected only owner's file, got %+v", items)
	}
}

func TestUploadServiceList_IncludeAll(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	role := testutil.SeedTestRole(ctx, client, "uploader", []string{"upload:create"})
	owner := testutil.SeedTestUser(ctx, client, "owner", "password123", role.ID)
	other := testutil.SeedTestUser(ctx, client, "other", "password123", role.ID)

	svc := NewUploadService(t.TempDir(), client)
	if _, err := svc.SaveGeneratedFile(ctx, "owner.csv", []byte("owner"), "text/csv", owner.ID, owner.Username); err != nil {
		t.Fatalf("save owner file: %v", err)
	}
	if _, err := svc.SaveGeneratedFile(ctx, "other.csv", []byte("other"), "text/csv", other.ID, other.Username); err != nil {
		t.Fatalf("save other file: %v", err)
	}

	result, err := svc.List(ctx, &models.FileListQuery{Page: 1, PageSize: 20}, owner.ID, true)
	if err != nil {
		t.Fatalf("list files: %v", err)
	}
	if result.Total != 2 {
		t.Fatalf("expected 2 visible files, got %d", result.Total)
	}
}
