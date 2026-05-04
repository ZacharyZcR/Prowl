package services

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"go.uber.org/zap"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/conversation"
	"github.com/ZacharyZcR/STC/backend/ent/message"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services/agent"
	"github.com/ZacharyZcR/STC/backend/pkg/llm"
)

type AIService struct {
	client *ent.Client
	logger *zap.Logger
}

func NewAIService(client *ent.Client) *AIService {
	return &AIService{client: client, logger: zap.L()}
}

// AgentStreamEvent represents a rich SSE event sent to the frontend.
type AgentStreamEvent struct {
	Type string `json:"type"` // "text", "thinking", "tool_call", "tool_result", "trace_step", "spin_warning", "error", "done"
	Data any    `json:"data"`
}

// ---------- AI Config (singleton) ----------

func (s *AIService) GetConfig(ctx context.Context) (*ent.AiConfig, error) {
	return s.client.AiConfig.Query().First(ctx)
}

func (s *AIService) UpdateConfig(ctx context.Context, req *models.UpdateAIConfigRequest) (*ent.AiConfig, error) {
	cfg, err := s.GetConfig(ctx)
	if err != nil {
		return nil, err
	}
	up := s.client.AiConfig.UpdateOneID(cfg.ID)
	if req.Provider != nil {
		up.SetProvider(*req.Provider)
	}
	if req.APIKey != nil {
		up.SetAPIKey(*req.APIKey)
	}
	if req.APIBase != nil {
		up.SetAPIBase(*req.APIBase)
	}
	if req.Model != nil {
		up.SetModel(*req.Model)
	}
	if req.MaxTokens != nil {
		up.SetMaxTokens(*req.MaxTokens)
	}
	if req.Temperature != nil {
		up.SetTemperature(*req.Temperature)
	}
	if req.SystemPrompt != nil {
		up.SetSystemPrompt(*req.SystemPrompt)
	}
	return up.Save(ctx)
}

// ---------- Conversations ----------

func (s *AIService) CreateConversation(ctx context.Context, userID int, title string) (*ent.Conversation, error) {
	if title == "" {
		title = "New Chat"
	}
	return s.client.Conversation.Create().
		SetUserID(userID).
		SetTitle(title).
		Save(ctx)
}

func (s *AIService) ListConversations(ctx context.Context, userID int) ([]*ent.Conversation, error) {
	return s.client.Conversation.Query().
		Where(conversation.UserID(userID)).
		Order(ent.Desc(conversation.FieldCreatedAt)).
		All(ctx)
}

func (s *AIService) DeleteConversation(ctx context.Context, id, userID int) error {
	conv, err := s.client.Conversation.Query().
		Where(conversation.ID(id), conversation.UserID(userID)).
		Only(ctx)
	if err != nil {
		return err
	}
	_, _ = s.client.Message.Delete().
		Where(message.ConversationID(conv.ID)).
		Exec(ctx)
	return s.client.Conversation.DeleteOneID(conv.ID).Exec(ctx)
}

// ---------- Messages ----------

func (s *AIService) GetMessages(ctx context.Context, conversationID, userID int) ([]*ent.Message, error) {
	exists, err := s.client.Conversation.Query().
		Where(conversation.ID(conversationID), conversation.UserID(userID)).
		Exist(ctx)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, fmt.Errorf("conversation not found")
	}
	return s.client.Message.Query().
		Where(message.ConversationID(conversationID)).
		Order(ent.Asc(message.FieldCreatedAt)).
		All(ctx)
}

func (s *AIService) SaveMessage(ctx context.Context, conversationID int, role, content string, tokenCount int) (*ent.Message, error) {
	return s.client.Message.Create().
		SetConversationID(conversationID).
		SetRole(message.Role(role)).
		SetContent(content).
		SetTokenCount(tokenCount).
		Save(ctx)
}

// ---------- Agent Chat ----------

// AgentChat runs the Agent engine with tool calling and streams events back.
func (s *AIService) AgentChat(ctx context.Context, conversationID, userID int, userMessage string) (<-chan AgentStreamEvent, error) {
	// verify ownership
	exists, err := s.client.Conversation.Query().
		Where(conversation.ID(conversationID), conversation.UserID(userID)).
		Exist(ctx)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, fmt.Errorf("conversation not found")
	}

	// save user message
	if _, err := s.SaveMessage(ctx, conversationID, "user", userMessage, 0); err != nil {
		return nil, err
	}

	// load AI config
	cfg, err := s.GetConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("AI not configured")
	}
	if cfg.APIKey == "" {
		return nil, fmt.Errorf("API key not configured")
	}

	// load conversation history
	historyMsgs, err := s.loadConversationContext(ctx, conversationID)
	if err != nil {
		return nil, err
	}

	// Build LLM provider
	provider := llm.NewOpenAIProvider(cfg.Provider, cfg.APIBase, cfg.APIKey)

	// Build Agent engine
	builtin := agent.NewBuiltinExecutor()
	executor := agent.NewCompositeExecutor(builtin)
	eng := agent.NewEngine(agent.EngineConfig{
		Provider:      provider,
		Model:         cfg.Model,
		MaxTokens:     cfg.MaxTokens,
		MaxToolRounds: 25,
		Executor:      executor,
		Logger:        s.logger,
	})

	// Convert DB messages to LLM messages
	var history []llm.Message
	for _, m := range historyMsgs {
		// Skip the user message we just saved (it's the last one)
		history = append(history, llm.Message{
			Role:    string(m.Role),
			Content: m.Content,
		})
	}

	// User message is already in history (just saved), so pass empty userMessages
	// The last message in history IS the user message
	tools := agent.BuiltinToolDefinitions()

	ch := make(chan AgentStreamEvent, 64)

	go func() {
		defer close(ch)

		agentCh := eng.RunStream(ctx, cfg.SystemPrompt, history, nil, tools)

		var fullContent strings.Builder
		for event := range agentCh {
			// Forward agent events to the output channel
			ch <- AgentStreamEvent{Type: event.Type, Data: event.Data}

			// Accumulate text content for saving
			if event.Type == "text" {
				if td, ok := event.Data.(agent.TextData); ok {
					fullContent.WriteString(td.Content)
				}
			}
		}

		// Save assistant reply
		if fullContent.Len() > 0 {
			saveCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			tokenUsage := eng.UsageTracker().Summary()
			if _, err := s.SaveMessage(saveCtx, conversationID, "assistant", fullContent.String(), tokenUsage.TotalTokens); err != nil {
				ch <- AgentStreamEvent{Type: "error", Data: err.Error()}
			}
		}
	}()

	return ch, nil
}

func (s *AIService) loadConversationContext(ctx context.Context, conversationID int) ([]*ent.Message, error) {
	msgs, err := s.client.Message.Query().
		Where(message.ConversationID(conversationID)).
		Order(ent.Desc(message.FieldCreatedAt)).
		Limit(20).
		All(ctx)
	if err != nil {
		return nil, err
	}
	slices.Reverse(msgs)
	return msgs, nil
}

// ---------- Response builders ----------

func BuildConversationResponse(c *ent.Conversation) models.ConversationResponse {
	return models.ConversationResponse{
		ID:        c.ID,
		Title:     c.Title,
		Model:     c.Model,
		CreatedAt: c.CreatedAt.Format(time.RFC3339),
		UpdatedAt: c.UpdatedAt.Format(time.RFC3339),
	}
}

func BuildMessageResponse(m *ent.Message) models.MessageResponse {
	return models.MessageResponse{
		ID:             m.ID,
		ConversationID: m.ConversationID,
		Role:           string(m.Role),
		Content:        m.Content,
		CreatedAt:      m.CreatedAt.Format(time.RFC3339),
	}
}

func BuildAIConfigResponse(cfg *ent.AiConfig) models.AIConfigResponse {
	return models.AIConfigResponse{
		Provider:     cfg.Provider,
		APIBase:      cfg.APIBase,
		Model:        cfg.Model,
		MaxTokens:    cfg.MaxTokens,
		Temperature:  cfg.Temperature,
		SystemPrompt: cfg.SystemPrompt,
		HasAPIKey:    cfg.APIKey != "",
	}
}
