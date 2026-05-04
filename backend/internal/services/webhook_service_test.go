package services

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/testutil"
)

func createTestWebhook(ctx context.Context, svc *WebhookService, name string) (*models.CreateWebhookRequest, error) {
	req := &models.CreateWebhookRequest{
		Name:   name,
		URL:    "https://example.com/webhook",
		Events: []string{"error.new", "user.login"},
	}
	_, err := svc.Create(ctx, req)
	return req, err
}

func TestWebhook_Create(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	svc := NewWebhookService(client)

	w, err := svc.Create(ctx, &models.CreateWebhookRequest{
		Name:    "test-hook",
		URL:     "https://example.com/hook",
		Secret:  "my-secret",
		Events:  []string{"error.new"},
		Headers: map[string]string{"X-Custom": "value"},
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if w.Name != "test-hook" {
		t.Fatalf("expected name test-hook, got %s", w.Name)
	}
	if w.Secret != "my-secret" {
		t.Fatalf("expected secret my-secret, got %s", w.Secret)
	}
	if !w.Enabled {
		t.Fatal("expected enabled=true by default")
	}
}

func TestWebhook_List(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	svc := NewWebhookService(client)

	createTestWebhook(ctx, svc, "hook-1")
	createTestWebhook(ctx, svc, "hook-2")

	items, err := svc.List(ctx)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 webhooks, got %d", len(items))
	}
}

func TestWebhook_Update(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	svc := NewWebhookService(client)

	w, _ := svc.Create(ctx, &models.CreateWebhookRequest{
		Name:   "original",
		URL:    "https://example.com/old",
		Events: []string{"error.new"},
	})

	newName := "updated"
	newURL := "https://example.com/new"
	updated, err := svc.Update(ctx, w.ID, &models.UpdateWebhookRequest{
		Name: &newName,
		URL:  &newURL,
	})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated.Name != "updated" {
		t.Fatalf("expected name updated, got %s", updated.Name)
	}
	if updated.URL != "https://example.com/new" {
		t.Fatalf("expected new URL, got %s", updated.URL)
	}
}

func TestWebhook_Delete(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	svc := NewWebhookService(client)

	w, _ := svc.Create(ctx, &models.CreateWebhookRequest{
		Name:   "to-delete",
		URL:    "https://example.com/del",
		Events: []string{"error.new"},
	})

	if err := svc.Delete(ctx, w.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}

	_, err := svc.GetByID(ctx, w.ID)
	if err == nil {
		t.Fatal("expected error after deletion")
	}
}

func TestWebhook_Toggle(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	svc := NewWebhookService(client)

	w, _ := svc.Create(ctx, &models.CreateWebhookRequest{
		Name:   "toggle-me",
		URL:    "https://example.com/toggle",
		Events: []string{"error.new"},
	})

	// Default is enabled=true, toggle to false
	if err := svc.Toggle(ctx, w.ID); err != nil {
		t.Fatalf("toggle off: %v", err)
	}
	w2, _ := svc.GetByID(ctx, w.ID)
	if w2.Enabled {
		t.Fatal("expected enabled=false after first toggle")
	}

	// Toggle back to true
	if err := svc.Toggle(ctx, w.ID); err != nil {
		t.Fatalf("toggle on: %v", err)
	}
	w3, _ := svc.GetByID(ctx, w.ID)
	if !w3.Enabled {
		t.Fatal("expected enabled=true after second toggle")
	}
}

func TestWebhook_Test_UsesConfiguredHTTPClient(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("User-Agent") != "Prowl-Webhook/1.0" {
			t.Fatalf("unexpected user-agent: %s", r.Header.Get("User-Agent"))
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	client := testutil.NewTestClient(t)
	ctx := context.Background()
	svc := NewWebhookServiceWithHTTPClient(client, server.Client())

	w, err := svc.Create(ctx, &models.CreateWebhookRequest{
		Name:   "test-hook",
		URL:    server.URL,
		Events: []string{"webhook.test"},
	})
	if err != nil {
		t.Fatalf("create webhook: %v", err)
	}

	result, err := svc.Test(ctx, w.ID)
	if err != nil {
		t.Fatalf("test webhook: %v", err)
	}
	if result.StatusCode != http.StatusNoContent {
		t.Fatalf("expected 204 response, got %d", result.StatusCode)
	}
}

func TestWebhook_Trigger_AccumulatesFailureCount(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	client := testutil.NewTestClient(t)
	ctx := context.Background()
	svc := NewWebhookServiceWithHTTPClient(client, server.Client())

	w, err := svc.Create(ctx, &models.CreateWebhookRequest{
		Name:   "failure-hook",
		URL:    server.URL,
		Events: []string{"error.new"},
	})
	if err != nil {
		t.Fatalf("create webhook: %v", err)
	}

	svc.Trigger(ctx, "error.new", map[string]string{"id": "1"})
	waitForWebhookFailureCount(t, svc, ctx, w.ID, 1)

	svc.Trigger(ctx, "error.new", map[string]string{"id": "2"})
	waitForWebhookFailureCount(t, svc, ctx, w.ID, 2)
}

func waitForWebhookFailureCount(t *testing.T, svc *WebhookService, ctx context.Context, webhookID int, expected int) {
	t.Helper()

	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		current, getErr := svc.GetByID(ctx, webhookID)
		if getErr != nil {
			time.Sleep(20 * time.Millisecond)
			continue
		}
		if current.FailureCount == expected {
			return
		}
		time.Sleep(20 * time.Millisecond)
	}

	current, err := svc.GetByID(ctx, webhookID)
	if err != nil {
		t.Fatalf("get webhook: %v", err)
	}
	if current.FailureCount != expected {
		t.Fatalf("expected failure_count %d, got %d", expected, current.FailureCount)
	}
}
