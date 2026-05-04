package services

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/internal/services/agent"
	"github.com/ZacharyZcR/STC/backend/internal/testutil"
)

func seedAITestUsers(ctx context.Context, client *ent.Client) (*ent.User, *ent.User) {
	role := testutil.SeedTestRole(ctx, client, "user", []string{"*"})
	u1 := testutil.SeedTestUser(ctx, client, "aiuser1", "pass123", role.ID)
	u2 := testutil.SeedTestUser(ctx, client, "aiuser2", "pass123", role.ID)
	return u1, u2
}

func TestAI_CreateConversation(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	u1, _ := seedAITestUsers(ctx, client)
	svc := NewAIService(client)

	conv, err := svc.CreateConversation(ctx, u1.ID, "Test Chat")
	if err != nil {
		t.Fatalf("create conversation: %v", err)
	}
	if conv.Title != "Test Chat" {
		t.Fatalf("expected title Test Chat, got %s", conv.Title)
	}
	if conv.UserID != u1.ID {
		t.Fatalf("expected user_id %d, got %d", u1.ID, conv.UserID)
	}
}

func TestAI_CreateConversation_DefaultTitle(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	u1, _ := seedAITestUsers(ctx, client)
	svc := NewAIService(client)

	conv, err := svc.CreateConversation(ctx, u1.ID, "")
	if err != nil {
		t.Fatalf("create conversation: %v", err)
	}
	if conv.Title != "New Chat" {
		t.Fatalf("expected default title New Chat, got %s", conv.Title)
	}
}

func TestAI_ListConversations(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	u1, u2 := seedAITestUsers(ctx, client)
	svc := NewAIService(client)

	svc.CreateConversation(ctx, u1.ID, "User1 Chat A")
	svc.CreateConversation(ctx, u1.ID, "User1 Chat B")
	svc.CreateConversation(ctx, u2.ID, "User2 Chat")

	convs, err := svc.ListConversations(ctx, u1.ID)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(convs) != 2 {
		t.Fatalf("expected 2 conversations for user 1, got %d", len(convs))
	}

	convs, err = svc.ListConversations(ctx, u2.ID)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(convs) != 1 {
		t.Fatalf("expected 1 conversation for user 2, got %d", len(convs))
	}
}

func TestAI_DeleteConversation(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	u1, _ := seedAITestUsers(ctx, client)
	svc := NewAIService(client)

	conv, _ := svc.CreateConversation(ctx, u1.ID, "To Delete")
	svc.SaveMessage(ctx, conv.ID, "user", "hello", 0)

	err := svc.DeleteConversation(ctx, conv.ID, u1.ID)
	if err != nil {
		t.Fatalf("delete: %v", err)
	}

	convs, _ := svc.ListConversations(ctx, u1.ID)
	if len(convs) != 0 {
		t.Fatalf("expected 0 conversations after delete, got %d", len(convs))
	}

	msgs, _ := client.Message.Query().All(ctx)
	if len(msgs) != 0 {
		t.Fatalf("expected 0 messages after delete, got %d", len(msgs))
	}
}

func TestAI_DeleteConversation_WrongUser(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	u1, _ := seedAITestUsers(ctx, client)
	svc := NewAIService(client)

	conv, _ := svc.CreateConversation(ctx, u1.ID, "Private")

	err := svc.DeleteConversation(ctx, conv.ID, 999)
	if err == nil {
		t.Fatal("expected error when deleting another user's conversation")
	}
}

func TestAI_SaveMessage(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	u1, _ := seedAITestUsers(ctx, client)
	svc := NewAIService(client)

	conv, _ := svc.CreateConversation(ctx, u1.ID, "Chat")
	msg, err := svc.SaveMessage(ctx, conv.ID, "user", "hello world", 5)
	if err != nil {
		t.Fatalf("save message: %v", err)
	}
	if msg.Content != "hello world" {
		t.Fatalf("expected content hello world, got %s", msg.Content)
	}
	if msg.ConversationID != conv.ID {
		t.Fatalf("expected conversation_id %d, got %d", conv.ID, msg.ConversationID)
	}
}

func TestAI_GetMessages(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	u1, _ := seedAITestUsers(ctx, client)
	svc := NewAIService(client)

	conv, _ := svc.CreateConversation(ctx, u1.ID, "Chat")
	svc.SaveMessage(ctx, conv.ID, "user", "hello", 0)
	svc.SaveMessage(ctx, conv.ID, "assistant", "hi there", 0)

	msgs, err := svc.GetMessages(ctx, conv.ID, u1.ID)
	if err != nil {
		t.Fatalf("get messages: %v", err)
	}
	if len(msgs) != 2 {
		t.Fatalf("expected 2 messages, got %d", len(msgs))
	}
	if string(msgs[0].Role) != "user" {
		t.Fatalf("expected first message role=user, got %s", msgs[0].Role)
	}
}

func TestAI_GetMessages_WrongUser(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	u1, _ := seedAITestUsers(ctx, client)
	svc := NewAIService(client)

	conv, _ := svc.CreateConversation(ctx, u1.ID, "Private")
	svc.SaveMessage(ctx, conv.ID, "user", "secret", 0)

	_, err := svc.GetMessages(ctx, conv.ID, 999)
	if err == nil {
		t.Fatal("expected error when reading another user's messages")
	}
}

func TestAI_AgentChat_StreamsTextAndSaves(t *testing.T) {
	client := testutil.NewTestClient(t)
	ctx := context.Background()
	u1, _ := seedAITestUsers(ctx, client)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		fmt.Fprint(w, "data: {\"choices\":[{\"delta\":{\"content\":\"hello\"}}]}\n\n")
		fmt.Fprint(w, "data: {\"choices\":[{\"delta\":{\"content\":\" world\"}}]}\n\n")
		fmt.Fprint(w, "data: [DONE]\n\n")
	}))
	defer server.Close()

	if _, err := client.AiConfig.Create().
		SetProvider("openai").
		SetAPIKey("test-key").
		SetAPIBase(server.URL).
		SetModel("gpt-test").
		SetSystemPrompt("").
		Save(ctx); err != nil {
		t.Fatalf("create ai config: %v", err)
	}

	svc := NewAIService(client)
	conv, err := svc.CreateConversation(ctx, u1.ID, "Chat")
	if err != nil {
		t.Fatalf("create conversation: %v", err)
	}

	stream, err := svc.AgentChat(ctx, conv.ID, u1.ID, "Hi")
	if err != nil {
		t.Fatalf("agent chat: %v", err)
	}

	var textContent string
	for event := range stream {
		if event.Type == "text" {
			if td, ok := event.Data.(agent.TextData); ok {
				textContent += td.Content
			}
		}
		if event.Type == "error" {
			t.Fatalf("unexpected error: %v", event.Data)
		}
	}

	if textContent != "hello world" {
		t.Fatalf("expected text 'hello world', got %q", textContent)
	}

	msgs, err := svc.GetMessages(ctx, conv.ID, u1.ID)
	if err != nil {
		t.Fatalf("get messages: %v", err)
	}
	if len(msgs) != 2 {
		t.Fatalf("expected 2 messages after chat, got %d", len(msgs))
	}
	if msgs[1].Content != "hello world" {
		t.Fatalf("expected assistant reply to be persisted, got %q", msgs[1].Content)
	}
}
