package services

import (
	"context"
	"testing"

	"github.com/ZacharyZcR/STC/backend/ent/errorlog"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/testutil"
)

func recordTestError(ctx context.Context, svc *ErrorLogService, errType, message string, statusCode int) error {
	return svc.Record(ctx, &RecordInput{
		Source:     "backend",
		ErrType:   errType,
		Message:   message,
		Stack:     "goroutine 1 [running]:\nmain.main()",
		URL:       "/api/test",
		Method:    "GET",
		StatusCode: statusCode,
		UserAgent: "test-agent",
		RequestID: "req-001",
		UserID:    1,
	})
}

func TestRecord_NewError(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	svc := NewErrorLogService(client)

	err := recordTestError(ctx, svc, "runtime_error", "nil pointer dereference", 500)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	logs, err := client.ErrorLog.Query().All(ctx)
	if err != nil {
		t.Fatalf("query failed: %v", err)
	}
	if len(logs) != 1 {
		t.Fatalf("expected 1 log, got %d", len(logs))
	}
	if logs[0].ErrType != "runtime_error" {
		t.Fatalf("expected err_type runtime_error, got %s", logs[0].ErrType)
	}
	if logs[0].OccurrenceCount != 1 {
		t.Fatalf("expected occurrence_count 1, got %d", logs[0].OccurrenceCount)
	}
	if logs[0].Severity != errorlog.SeverityHigh {
		t.Fatalf("expected severity high for 500, got %s", logs[0].Severity)
	}
}

func TestRecord_DuplicateError(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	svc := NewErrorLogService(client)

	// Record same error twice
	if err := recordTestError(ctx, svc, "runtime_error", "same message", 500); err != nil {
		t.Fatalf("first record: %v", err)
	}
	if err := recordTestError(ctx, svc, "runtime_error", "same message", 500); err != nil {
		t.Fatalf("second record: %v", err)
	}

	logs, _ := client.ErrorLog.Query().All(ctx)
	if len(logs) != 1 {
		t.Fatalf("expected 1 deduplicated log, got %d", len(logs))
	}
	if logs[0].OccurrenceCount != 2 {
		t.Fatalf("expected occurrence_count 2, got %d", logs[0].OccurrenceCount)
	}
}

func TestRecord_ReopenResolved(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	svc := NewErrorLogService(client)

	// Record, resolve, then record again
	if err := recordTestError(ctx, svc, "runtime_error", "reopen me", 500); err != nil {
		t.Fatalf("first record: %v", err)
	}

	logs, _ := client.ErrorLog.Query().All(ctx)
	if err := svc.Resolve(ctx, logs[0].ID, 1); err != nil {
		t.Fatalf("resolve: %v", err)
	}

	// Verify resolved
	log, _ := client.ErrorLog.Get(ctx, logs[0].ID)
	if !log.Resolved {
		t.Fatal("expected resolved=true after Resolve")
	}

	// Record same error again — should reopen
	if err := recordTestError(ctx, svc, "runtime_error", "reopen me", 500); err != nil {
		t.Fatalf("re-record: %v", err)
	}

	log, _ = client.ErrorLog.Get(ctx, logs[0].ID)
	if log.Resolved {
		t.Fatal("expected resolved=false after re-record")
	}
	if log.OccurrenceCount != 2 {
		t.Fatalf("expected occurrence_count 2, got %d", log.OccurrenceCount)
	}
}

func TestResolve(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	svc := NewErrorLogService(client)

	recordTestError(ctx, svc, "runtime_error", "resolve me", 500)
	logs, _ := client.ErrorLog.Query().All(ctx)

	if err := svc.Resolve(ctx, logs[0].ID, 42); err != nil {
		t.Fatalf("resolve: %v", err)
	}

	log, _ := client.ErrorLog.Get(ctx, logs[0].ID)
	if !log.Resolved {
		t.Fatal("expected resolved=true")
	}
	if log.ResolvedBy != 42 {
		t.Fatalf("expected resolved_by=42, got %d", log.ResolvedBy)
	}
	if log.ResolvedAt == nil {
		t.Fatal("expected resolved_at to be set")
	}
}

func TestBulkResolve(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	svc := NewErrorLogService(client)

	recordTestError(ctx, svc, "error_a", "msg a", 500)
	recordTestError(ctx, svc, "error_b", "msg b", 500)
	recordTestError(ctx, svc, "error_c", "msg c", 500)

	logs, _ := client.ErrorLog.Query().All(ctx)
	ids := []int{logs[0].ID, logs[1].ID}

	if err := svc.BulkResolve(ctx, ids, 1); err != nil {
		t.Fatalf("bulk resolve: %v", err)
	}

	resolved, _ := client.ErrorLog.Query().Where(errorlog.Resolved(true)).Count(ctx)
	if resolved != 2 {
		t.Fatalf("expected 2 resolved, got %d", resolved)
	}

	unresolved, _ := client.ErrorLog.Query().Where(errorlog.Resolved(false)).Count(ctx)
	if unresolved != 1 {
		t.Fatalf("expected 1 unresolved, got %d", unresolved)
	}
}

func TestList_FilterBySeverity(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	svc := NewErrorLogService(client)

	// panic → critical, 500 → high, auth_error → medium, other 200 → low
	recordTestError(ctx, svc, "panic", "panic msg", 0)
	recordTestError(ctx, svc, "runtime_error", "server error", 500)
	recordTestError(ctx, svc, "auth_error", "unauthorized", 401)

	result, err := svc.List(ctx, &models.ErrorLogQuery{
		Page:     1,
		PageSize: 20,
		Severity: "critical",
	})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if result.Total != 1 {
		t.Fatalf("expected 1 critical error, got %d", result.Total)
	}
}

func TestStatistics(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	svc := NewErrorLogService(client)

	recordTestError(ctx, svc, "panic", "panic msg", 0)
	recordTestError(ctx, svc, "runtime_error", "server error", 500)
	recordTestError(ctx, svc, "auth_error", "unauthorized", 401)

	// Resolve one
	logs, _ := client.ErrorLog.Query().Where(errorlog.ErrType("panic")).All(ctx)
	svc.Resolve(ctx, logs[0].ID, 1)

	stats, err := svc.Statistics(ctx)
	if err != nil {
		t.Fatalf("statistics: %v", err)
	}
	if stats.Total != 3 {
		t.Fatalf("expected total 3, got %d", stats.Total)
	}
	if stats.Unresolved != 2 {
		t.Fatalf("expected unresolved 2, got %d", stats.Unresolved)
	}
	if stats.BySeverity["critical"] != 1 {
		t.Fatalf("expected 1 critical, got %d", stats.BySeverity["critical"])
	}
	if stats.BySeverity["high"] != 1 {
		t.Fatalf("expected 1 high, got %d", stats.BySeverity["high"])
	}
	if stats.BySource["backend"] != 3 {
		t.Fatalf("expected 3 backend, got %d", stats.BySource["backend"])
	}
}
