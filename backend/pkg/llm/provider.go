package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
)

// Provider is the interface for LLM backends (OpenAI-compatible).
type Provider interface {
	Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error)
	ChatStream(ctx context.Context, req ChatRequest) (<-chan StreamChunk, error)
	Name() string
}

// ChatRequest represents a request to the LLM.
type ChatRequest struct {
	Model       string   `json:"model"`
	Messages    []Message `json:"messages"`
	Tools       []Tool   `json:"tools,omitempty"`
	Stream      bool     `json:"stream,omitempty"`
	Temperature *float64 `json:"temperature,omitempty"`
	MaxTokens   *int     `json:"max_tokens,omitempty"`
	TopP        *float64 `json:"top_p,omitempty"`
}

// Message represents a chat message.
type Message struct {
	Role             string     `json:"-"`
	Content          string     `json:"-"`
	ReasoningContent string     `json:"-"`
	ToolCalls        []ToolCall `json:"-"`
	ToolCallID       string     `json:"-"`
}

func (m Message) MarshalJSON() ([]byte, error) {
	type wire struct {
		Role             string     `json:"role"`
		Content          string     `json:"content"`
		ReasoningContent string     `json:"reasoning_content,omitempty"`
		ToolCalls        []ToolCall `json:"tool_calls,omitempty"`
		ToolCallID       string     `json:"tool_call_id,omitempty"`
	}
	return json.Marshal(wire{
		Role:             m.Role,
		Content:          m.Content,
		ReasoningContent: m.ReasoningContent,
		ToolCalls:        m.ToolCalls,
		ToolCallID:       m.ToolCallID,
	})
}

func (m *Message) UnmarshalJSON(data []byte) error {
	type wire struct {
		Role             string          `json:"role"`
		Content          json.RawMessage `json:"content"`
		ReasoningContent string          `json:"reasoning_content,omitempty"`
		ToolCalls        []ToolCall      `json:"tool_calls,omitempty"`
		ToolCallID       string          `json:"tool_call_id,omitempty"`
	}
	var w wire
	if err := json.Unmarshal(data, &w); err != nil {
		return err
	}
	m.Role = w.Role
	m.ReasoningContent = w.ReasoningContent
	m.ToolCalls = w.ToolCalls
	m.ToolCallID = w.ToolCallID

	if len(w.Content) == 0 || string(w.Content) == "null" {
		return nil
	}
	var s string
	if err := json.Unmarshal(w.Content, &s); err == nil {
		m.Content = s
	}
	return nil
}

// Tool describes a function the model can call.
type Tool struct {
	Type     string       `json:"type"`
	Function ToolFunction `json:"function"`
}

type ToolFunction struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Parameters  any    `json:"parameters"`
}

type ToolCall struct {
	Index    *int             `json:"index,omitempty"`
	ID       string           `json:"id"`
	Type     string           `json:"type"`
	Function ToolCallFunction `json:"function"`
}

type ToolCallFunction struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

type ChatResponse struct {
	ID      string  `json:"id"`
	Model   string  `json:"model"`
	Message Message `json:"message"`
	Usage   Usage   `json:"usage"`
}

type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type StreamChunk struct {
	ID    string     `json:"id,omitempty"`
	Delta ChunkDelta `json:"delta"`
	Usage *Usage     `json:"usage,omitempty"`
	Err   error      `json:"-"`
}

type ChunkDelta struct {
	Role             string     `json:"role,omitempty"`
	Content          string     `json:"content,omitempty"`
	ReasoningContent string     `json:"reasoning_content,omitempty"`
	ToolCalls        []ToolCall `json:"tool_calls,omitempty"`
}

// APIError represents an error from the LLM API.
type APIError struct {
	StatusCode int
	Body       string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("LLM API error %d: %s", e.StatusCode, e.Body)
}

// UsageTracker accumulates token usage across multiple LLM calls.
type UsageTracker struct {
	mu               sync.Mutex
	PromptTokens     int              `json:"prompt_tokens"`
	CompletionTokens int              `json:"completion_tokens"`
	TotalTokens      int              `json:"total_tokens"`
	CallCount        int              `json:"call_count"`
	ByModel          map[string]Usage `json:"by_model,omitempty"`
}

func NewUsageTracker() *UsageTracker {
	return &UsageTracker{ByModel: make(map[string]Usage)}
}

func (t *UsageTracker) Record(model string, u Usage) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.PromptTokens += u.PromptTokens
	t.CompletionTokens += u.CompletionTokens
	t.TotalTokens += u.TotalTokens
	t.CallCount++
	prev := t.ByModel[model]
	prev.PromptTokens += u.PromptTokens
	prev.CompletionTokens += u.CompletionTokens
	prev.TotalTokens += u.TotalTokens
	t.ByModel[model] = prev
}

func (t *UsageTracker) Summary() Usage {
	t.mu.Lock()
	defer t.mu.Unlock()
	return Usage{
		PromptTokens:     t.PromptTokens,
		CompletionTokens: t.CompletionTokens,
		TotalTokens:      t.TotalTokens,
	}
}
