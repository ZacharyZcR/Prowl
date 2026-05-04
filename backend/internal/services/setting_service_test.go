package services

import (
	"context"
	"testing"

	"github.com/ZacharyZcR/STC/backend/internal/testutil"
)

func TestSettingListByGroup(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()

	// Seed settings in two groups
	client.Setting.Create().SetKey("site_name").SetValue("Prowl Range").SetGroupName("general").SetDisplayName("Site Name").SetValueType("string").SetSortOrder(1).SetIsSecret(false).SaveX(ctx)
	client.Setting.Create().SetKey("site_desc").SetValue("A platform").SetGroupName("general").SetDisplayName("Description").SetValueType("string").SetSortOrder(2).SetIsSecret(false).SaveX(ctx)
	client.Setting.Create().SetKey("smtp_host").SetValue("mail.test.local").SetGroupName("email").SetDisplayName("SMTP Host").SetValueType("string").SetSortOrder(1).SetIsSecret(false).SaveX(ctx)

	svc := NewSettingService(client)
	groups, err := svc.ListByGroup(ctx)
	if err != nil {
		t.Fatalf("list by group: %v", err)
	}
	if len(groups) != 2 {
		t.Fatalf("expected 2 groups, got %d", len(groups))
	}
	if groups[0].GroupName != "email" && groups[0].GroupName != "general" {
		t.Fatalf("unexpected group name: %s", groups[0].GroupName)
	}
}

func TestSettingUpdate(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()

	client.Setting.Create().SetKey("site_name").SetValue("Old").SetGroupName("general").SetDisplayName("Site Name").SetValueType("string").SetSortOrder(1).SetIsSecret(false).SaveX(ctx)

	svc := NewSettingService(client)
	err := svc.Update(ctx, map[string]string{"site_name": "New"})
	if err != nil {
		t.Fatalf("update: %v", err)
	}

	val, err := svc.Get(ctx, "site_name")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if val != "New" {
		t.Fatalf("expected New, got %s", val)
	}
}

func TestSettingUpdate_SkipMaskedSecret(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()

	client.Setting.Create().SetKey("api_key").SetValue("real-secret").SetGroupName("general").SetDisplayName("API Key").SetValueType("string").SetSortOrder(1).SetIsSecret(true).SaveX(ctx)

	svc := NewSettingService(client)
	// Send masked value — should be skipped
	err := svc.Update(ctx, map[string]string{"api_key": "••••••"})
	if err != nil {
		t.Fatalf("update: %v", err)
	}

	val, err := svc.Get(ctx, "api_key")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if val != "real-secret" {
		t.Fatalf("expected real-secret (unchanged), got %s", val)
	}
}

func TestSettingGet(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()

	client.Setting.Create().SetKey("timeout").SetValue("30").SetGroupName("general").SetDisplayName("Timeout").SetValueType("number").SetSortOrder(1).SetIsSecret(false).SaveX(ctx)

	svc := NewSettingService(client)
	val, err := svc.Get(ctx, "timeout")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if val != "30" {
		t.Fatalf("expected 30, got %s", val)
	}
}
