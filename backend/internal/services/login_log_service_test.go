package services

import (
	"context"
	"testing"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/testutil"
)

func TestLoginLog_Record(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	svc := NewLoginLogService(client)

	err := svc.Record(ctx, &LoginLogInput{
		UserID:    1,
		Username:  "admin",
		IP:        "127.0.0.1",
		UserAgent: "test-agent",
		Success:   true,
	})
	if err != nil {
		t.Fatalf("record: %v", err)
	}

	logs, _ := client.LoginLog.Query().All(ctx)
	if len(logs) != 1 {
		t.Fatalf("expected 1 log, got %d", len(logs))
	}
	if logs[0].Username != "admin" {
		t.Fatalf("expected username admin, got %s", logs[0].Username)
	}
}

func TestLoginLog_List(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	svc := NewLoginLogService(client)

	for i := 0; i < 5; i++ {
		svc.Record(ctx, &LoginLogInput{
			UserID:   1,
			Username: "admin",
			IP:       "127.0.0.1",
			Success:  true,
		})
	}

	result, err := svc.List(ctx, &models.LoginLogListQuery{Page: 1, PageSize: 3})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if result.Total != 5 {
		t.Fatalf("expected total 5, got %d", result.Total)
	}
	items := result.Items.([]models.LoginLogResponse)
	if len(items) != 3 {
		t.Fatalf("expected 3 items on page, got %d", len(items))
	}
}

func TestLoginLog_List_FilterBySuccess(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	svc := NewLoginLogService(client)

	svc.Record(ctx, &LoginLogInput{UserID: 1, Username: "admin", IP: "127.0.0.1", Success: true})
	svc.Record(ctx, &LoginLogInput{UserID: 1, Username: "admin", IP: "127.0.0.1", Success: true})
	svc.Record(ctx, &LoginLogInput{UserID: 0, Username: "hacker", IP: "10.0.0.1", Success: false, FailureReason: "wrong password"})

	// Filter success only
	result, err := svc.List(ctx, &models.LoginLogListQuery{Page: 1, PageSize: 20, Success: "true"})
	if err != nil {
		t.Fatalf("list success: %v", err)
	}
	if result.Total != 2 {
		t.Fatalf("expected 2 success, got %d", result.Total)
	}

	// Filter failure only
	result, err = svc.List(ctx, &models.LoginLogListQuery{Page: 1, PageSize: 20, Success: "false"})
	if err != nil {
		t.Fatalf("list failure: %v", err)
	}
	if result.Total != 1 {
		t.Fatalf("expected 1 failure, got %d", result.Total)
	}
}

func TestLoginLog_Statistics(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	svc := NewLoginLogService(client)

	svc.Record(ctx, &LoginLogInput{UserID: 1, Username: "admin", IP: "127.0.0.1", Success: true})
	svc.Record(ctx, &LoginLogInput{UserID: 1, Username: "admin", IP: "127.0.0.1", Success: true})
	svc.Record(ctx, &LoginLogInput{UserID: 0, Username: "bad", IP: "10.0.0.1", Success: false, FailureReason: "wrong password"})

	stats, err := svc.Statistics(ctx)
	if err != nil {
		t.Fatalf("statistics: %v", err)
	}
	if stats.Total != 3 {
		t.Fatalf("expected total 3, got %d", stats.Total)
	}
	if stats.SuccessCount != 2 {
		t.Fatalf("expected success_count 2, got %d", stats.SuccessCount)
	}
	if stats.FailureCount != 1 {
		t.Fatalf("expected failure_count 1, got %d", stats.FailureCount)
	}
	if stats.TodayCount != 3 {
		t.Fatalf("expected today_count 3, got %d", stats.TodayCount)
	}
}
