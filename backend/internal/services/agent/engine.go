package agent

import (
	"context"
	"fmt"
	"sync"
	"time"

	"go.uber.org/zap"

	"github.com/ZacharyZcR/STC/backend/pkg/llm"
)

const defaultMaxToolRounds = 25

// AgentEvent represents an event emitted during agent execution.
type AgentEvent struct {
	Type string `json:"type"` // "text", "thinking", "tool_call", "tool_result", "trace_step", "spin_warning", "error", "done"
	Data any    `json:"data"`
}

type TextData struct {
	Content string `json:"content"`
}

type ToolCallData struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Args string `json:"args"`
}

type ToolResultData struct {
	ID     string `json:"id"`
	Result string `json:"result"`
}

type DoneData struct {
	Usage llm.Usage   `json:"usage"`
	Trace []TraceStep `json:"trace,omitempty"`
}

type SpinWarningData struct {
	Pattern string `json:"pattern"`
	Round   int    `json:"round"`
}

// TraceStep captures a single step in the agent execution trace.
type TraceStep struct {
	Round      int    `json:"round"`
	Phase      string `json:"phase"` // "llm_call", "tool_exec", "decision"
	DurationMs int64  `json:"duration_ms"`
	Data       any    `json:"data"`
}

type TraceLLMData struct {
	Model            string `json:"model"`
	PromptTokens     int    `json:"prompt_tokens"`
	CompletionTokens int    `json:"completion_tokens"`
	HasToolCalls     bool   `json:"has_tool_calls"`
	ToolCount        int    `json:"tool_count"`
}

type TraceToolData struct {
	Name    string `json:"name"`
	Success bool   `json:"success"`
}

type TraceDecisionData struct {
	Action string `json:"action"` // "continue", "done", "error"
}

// Engine is the core ReAct agent loop.
type Engine struct {
	provider        llm.Provider
	fallbacks       []llm.Provider
	model           string
	contextManager  *ContextManager
	toolExecutor    ToolExecutor
	spinDetector    *SpinDetector
	reflectionCache *ReflectionCache
	maxToolRounds   int
	usageTracker    *llm.UsageTracker
	logger          *zap.Logger

	consecutiveErrors int
	useFallback       bool
}

// EngineConfig holds configuration for creating an Engine.
type EngineConfig struct {
	Provider      llm.Provider
	Fallbacks     []llm.Provider
	Model         string
	MaxTokens     int
	MaxToolRounds int
	Executor      ToolExecutor
	Logger        *zap.Logger
}

func NewEngine(cfg EngineConfig) *Engine {
	maxRounds := cfg.MaxToolRounds
	if maxRounds <= 0 {
		maxRounds = defaultMaxToolRounds
	}
	logger := cfg.Logger
	if logger == nil {
		logger = zap.NewNop()
	}
	executor := cfg.Executor
	if executor == nil {
		executor = &NoopExecutor{}
	}
	return &Engine{
		provider:        cfg.Provider,
		fallbacks:       cfg.Fallbacks,
		model:           cfg.Model,
		contextManager:  NewContextManager(cfg.MaxTokens),
		toolExecutor:    executor,
		spinDetector:    NewSpinDetector(3),
		reflectionCache: NewReflectionCache(3),
		maxToolRounds:   maxRounds,
		usageTracker:    llm.NewUsageTracker(),
		logger:          logger,
	}
}

// UsageTracker returns the accumulated token usage tracker.
func (e *Engine) UsageTracker() *llm.UsageTracker { return e.usageTracker }

func (e *Engine) emit(eventType string, data any) AgentEvent {
	return AgentEvent{Type: eventType, Data: data}
}

func (e *Engine) buildRequest(msgs []llm.Message, tools []llm.Tool, stream bool) llm.ChatRequest {
	return llm.ChatRequest{
		Model:    e.model,
		Messages: msgs,
		Tools:    tools,
		Stream:   stream,
	}
}

const consecutiveErrorThreshold = 3

func (e *Engine) chatWithFallback(ctx context.Context, req llm.ChatRequest) (*llm.ChatResponse, error) {
	provider := e.provider
	if e.useFallback && len(e.fallbacks) > 0 {
		provider = e.fallbacks[0]
	}

	resp, err := provider.Chat(ctx, req)
	if err == nil {
		e.consecutiveErrors = 0
		return resp, nil
	}

	if e.shouldSwitchFallback(err) {
		return e.fallbacks[0].Chat(ctx, req)
	}

	for _, fb := range e.fallbacks {
		e.logger.Warn("primary failed, trying fallback", zap.Error(err), zap.String("fallback", fb.Name()))
		resp, err = fb.Chat(ctx, req)
		if err == nil {
			e.consecutiveErrors = 0
			return resp, nil
		}
	}
	return nil, err
}

func (e *Engine) chatStreamWithFallback(ctx context.Context, req llm.ChatRequest) (<-chan llm.StreamChunk, error) {
	provider := e.provider
	if e.useFallback && len(e.fallbacks) > 0 {
		provider = e.fallbacks[0]
	}

	ch, err := provider.ChatStream(ctx, req)
	if err == nil {
		e.consecutiveErrors = 0
		return ch, nil
	}

	if e.shouldSwitchFallback(err) {
		return e.fallbacks[0].ChatStream(ctx, req)
	}

	for _, fb := range e.fallbacks {
		e.logger.Warn("primary failed, trying fallback", zap.Error(err), zap.String("fallback", fb.Name()))
		ch, err = fb.ChatStream(ctx, req)
		if err == nil {
			e.consecutiveErrors = 0
			return ch, nil
		}
	}
	return nil, err
}

func (e *Engine) shouldSwitchFallback(err error) bool {
	if len(e.fallbacks) == 0 || e.useFallback {
		return false
	}
	apiErr, ok := err.(*llm.APIError)
	if !ok {
		return false
	}
	if apiErr.StatusCode == 429 || apiErr.StatusCode == 529 {
		e.consecutiveErrors++
		if e.consecutiveErrors >= consecutiveErrorThreshold {
			e.logger.Warn("switching to fallback model", zap.Int("errors", e.consecutiveErrors))
			e.useFallback = true
			return true
		}
	}
	return false
}

// concurrentSafeTools are tools that can be executed in parallel.
var concurrentSafeTools = map[string]bool{
	"get_datetime": true,
	"math_calc":    true,
}

// handleToolExec executes tools, records spin data, and injects reflections.
func (e *Engine) handleToolExec(ctx context.Context, ch chan<- AgentEvent, msgs *[]llm.Message, toolCalls []llm.ToolCall, trace *[]TraceStep, round int) (abort bool) {
	var safeCalls, unsafeCalls []llm.ToolCall
	for _, tc := range toolCalls {
		if concurrentSafeTools[tc.Function.Name] {
			safeCalls = append(safeCalls, tc)
		} else {
			unsafeCalls = append(unsafeCalls, tc)
		}
	}

	// Execute concurrent-safe tools in parallel
	if len(safeCalls) > 0 {
		type toolResult struct {
			tc       llm.ToolCall
			result   string
			err      error
			duration int64
		}
		results := make([]toolResult, len(safeCalls))
		var wg sync.WaitGroup
		for i, tc := range safeCalls {
			ch <- e.emit("tool_call", ToolCallData{ID: tc.ID, Name: tc.Function.Name, Args: tc.Function.Arguments})
			wg.Add(1)
			go func(i int, tc llm.ToolCall) {
				defer wg.Done()
				t1 := time.Now()
				res, err := e.toolExecutor.Execute(ctx, tc.Function.Name, tc.Function.Arguments)
				results[i] = toolResult{tc: tc, result: res, err: err, duration: time.Since(t1).Milliseconds()}
			}(i, tc)
		}
		wg.Wait()

		for _, r := range results {
			if abort = e.processToolResult(ctx, ch, msgs, trace, r.tc, r.result, r.err, r.duration, round); abort {
				return true
			}
		}
	}

	// Execute non-concurrent tools sequentially
	for _, tc := range unsafeCalls {
		ch <- e.emit("tool_call", ToolCallData{ID: tc.ID, Name: tc.Function.Name, Args: tc.Function.Arguments})
		t1 := time.Now()
		result, execErr := e.toolExecutor.Execute(ctx, tc.Function.Name, tc.Function.Arguments)
		duration := time.Since(t1).Milliseconds()
		if abort = e.processToolResult(ctx, ch, msgs, trace, tc, result, execErr, duration, round); abort {
			return true
		}
	}

	// Inject cached reflections
	if cached := e.reflectionCache.BuildPromptSegment(); cached != "" {
		*msgs = append(*msgs, llm.Message{Role: "user", Content: cached})
	}

	// SPIN detection
	if detected, pattern := e.spinDetector.Check(); detected {
		if e.spinDetector.WasSpun() {
			ch <- e.emit("error", "agent stuck in loop: "+pattern)
			return true
		}
		e.spinDetector.MarkSpun()
		ch <- e.emit("spin_warning", SpinWarningData{Pattern: pattern, Round: round})

		rCtx := ReflectionContext{
			SpinPattern:   pattern,
			RecentHistory: e.spinDetector.RecentHistory(5),
			Round:         round,
		}
		ref := BuildReflection(ReflectionDeep, rCtx)
		*msgs = append(*msgs, ref)
		e.reflectionCache.Add(ReflectionSummary(ReflectionDeep, rCtx))
	}

	return false
}

func (e *Engine) processToolResult(ctx context.Context, ch chan<- AgentEvent, msgs *[]llm.Message, trace *[]TraceStep, tc llm.ToolCall, result string, execErr error, duration int64, round int) (abort bool) {
	toolSuccess := true
	if execErr != nil {
		result = fmt.Sprintf(`{"error":"%s"}`, execErr.Error())
		e.logger.Warn("tool execution failed", zap.String("tool", tc.Function.Name), zap.Error(execErr))
		toolSuccess = false
	}

	toolStep := TraceStep{
		Round: round, Phase: "tool_exec", DurationMs: duration,
		Data: TraceToolData{Name: tc.Function.Name, Success: toolSuccess},
	}
	*trace = append(*trace, toolStep)
	ch <- e.emit("trace_step", toolStep)
	ch <- e.emit("tool_result", ToolResultData{ID: tc.ID, Result: result})

	*msgs = append(*msgs, BuildToolResultMessage(tc.ID, result))
	e.spinDetector.Record(tc.Function.Name, tc.Function.Arguments, toolSuccess, round)

	if !toolSuccess {
		rCtx := ReflectionContext{
			FailedTool: tc.Function.Name,
			ErrorMsg:   execErr.Error(),
			Round:      round,
		}
		ref := BuildReflection(ReflectionLight, rCtx)
		*msgs = append(*msgs, ref)
		e.reflectionCache.Add(ReflectionSummary(ReflectionLight, rCtx))
	}

	select {
	case <-ctx.Done():
		ch <- e.emit("error", "context cancelled")
		return true
	default:
	}
	return false
}

// Run executes the agent loop (non-streaming model calls).
func (e *Engine) Run(ctx context.Context, systemPrompt string, history []llm.Message, userMessages []llm.Message, tools []llm.Tool) <-chan AgentEvent {
	ch := make(chan AgentEvent, 32)

	go func() {
		defer close(ch)

		msgs := e.contextManager.Build(systemPrompt, history, userMessages)
		var totalUsage llm.Usage
		var trace []TraceStep

		for round := range e.maxToolRounds {
			if round == e.maxToolRounds-3 {
				ch <- e.emit("text", TextData{Content: "\n\n> 工具调用接近上限，正在加速完成...\n\n"})
			}
			msgs = e.contextManager.Microcompact(msgs)
			t0 := time.Now()
			resp, err := e.chatWithFallback(ctx, e.buildRequest(msgs, tools, false))
			llmDuration := time.Since(t0).Milliseconds()

			if err != nil {
				trace = append(trace, TraceStep{Round: round, Phase: "decision", Data: TraceDecisionData{Action: "error"}})
				ch <- e.emit("error", err.Error())
				return
			}

			totalUsage.PromptTokens += resp.Usage.PromptTokens
			totalUsage.CompletionTokens += resp.Usage.CompletionTokens
			totalUsage.TotalTokens += resp.Usage.TotalTokens
			e.usageTracker.Record(e.model, resp.Usage)

			toolCalls := ParseToolCalls(resp.Message)
			llmStep := TraceStep{
				Round: round, Phase: "llm_call", DurationMs: llmDuration,
				Data: TraceLLMData{
					Model: e.model, PromptTokens: resp.Usage.PromptTokens,
					CompletionTokens: resp.Usage.CompletionTokens,
					HasToolCalls: len(toolCalls) > 0, ToolCount: len(toolCalls),
				},
			}
			trace = append(trace, llmStep)
			ch <- e.emit("trace_step", llmStep)

			if resp.Message.ReasoningContent != "" {
				ch <- e.emit("thinking", TextData{Content: resp.Message.ReasoningContent})
			}
			if resp.Message.Content != "" {
				ch <- e.emit("text", TextData{Content: resp.Message.Content})
			}

			if len(toolCalls) == 0 {
				decisionStep := TraceStep{Round: round, Phase: "decision", Data: TraceDecisionData{Action: "done"}}
				trace = append(trace, decisionStep)
				ch <- e.emit("trace_step", decisionStep)
				ch <- e.emit("done", DoneData{Usage: totalUsage, Trace: trace})
				return
			}

			msgs = append(msgs, resp.Message)
			if e.handleToolExec(ctx, ch, &msgs, toolCalls, &trace, round) {
				return
			}

			decisionStep := TraceStep{Round: round, Phase: "decision", Data: TraceDecisionData{Action: "continue"}}
			trace = append(trace, decisionStep)
			ch <- e.emit("trace_step", decisionStep)

			msgs = e.contextManager.Trim(msgs)
		}

		ch <- e.emit("error", "max tool call rounds exceeded")
	}()

	return ch
}

// RunStream is like Run but uses streaming for model calls.
func (e *Engine) RunStream(ctx context.Context, systemPrompt string, history []llm.Message, userMessages []llm.Message, tools []llm.Tool) <-chan AgentEvent {
	ch := make(chan AgentEvent, 64)

	go func() {
		defer close(ch)

		msgs := e.contextManager.Build(systemPrompt, history, userMessages)
		var totalUsage llm.Usage
		var trace []TraceStep

		for round := range e.maxToolRounds {
			if round == e.maxToolRounds-3 {
				ch <- e.emit("text", TextData{Content: "\n\n> 工具调用接近上限，正在加速完成...\n\n"})
			}
			msgs = e.contextManager.Microcompact(msgs)
			t0 := time.Now()
			streamCh, err := e.chatStreamWithFallback(ctx, e.buildRequest(msgs, tools, true))
			if err != nil {
				trace = append(trace, TraceStep{Round: round, Phase: "decision", Data: TraceDecisionData{Action: "error"}})
				ch <- e.emit("error", err.Error())
				return
			}

			var assistantMsg llm.Message
			assistantMsg.Role = "assistant"
			var roundUsage llm.Usage

			for chunk := range streamCh {
				if chunk.Err != nil {
					ch <- e.emit("error", chunk.Err.Error())
					return
				}
				if chunk.Delta.ReasoningContent != "" {
					assistantMsg.ReasoningContent += chunk.Delta.ReasoningContent
					ch <- e.emit("thinking", TextData{Content: chunk.Delta.ReasoningContent})
				}
				if chunk.Delta.Content != "" {
					assistantMsg.Content += chunk.Delta.Content
					ch <- e.emit("text", TextData{Content: chunk.Delta.Content})
				}
				if len(chunk.Delta.ToolCalls) > 0 {
					assistantMsg.ToolCalls = mergeToolCalls(assistantMsg.ToolCalls, chunk.Delta.ToolCalls)
				}
				if chunk.Usage != nil {
					roundUsage = *chunk.Usage
					totalUsage.PromptTokens += chunk.Usage.PromptTokens
					totalUsage.CompletionTokens += chunk.Usage.CompletionTokens
					totalUsage.TotalTokens += chunk.Usage.TotalTokens
				}
			}

			llmDuration := time.Since(t0).Milliseconds()
			toolCalls := ParseToolCalls(assistantMsg)

			llmStep := TraceStep{
				Round: round, Phase: "llm_call", DurationMs: llmDuration,
				Data: TraceLLMData{
					Model: e.model, PromptTokens: roundUsage.PromptTokens,
					CompletionTokens: roundUsage.CompletionTokens,
					HasToolCalls: len(toolCalls) > 0, ToolCount: len(toolCalls),
				},
			}
			trace = append(trace, llmStep)
			ch <- e.emit("trace_step", llmStep)

			if len(toolCalls) == 0 {
				decisionStep := TraceStep{Round: round, Phase: "decision", Data: TraceDecisionData{Action: "done"}}
				trace = append(trace, decisionStep)
				ch <- e.emit("trace_step", decisionStep)
				ch <- e.emit("done", DoneData{Usage: totalUsage, Trace: trace})
				return
			}

			msgs = append(msgs, assistantMsg)
			if e.handleToolExec(ctx, ch, &msgs, toolCalls, &trace, round) {
				return
			}

			decisionStep := TraceStep{Round: round, Phase: "decision", Data: TraceDecisionData{Action: "continue"}}
			trace = append(trace, decisionStep)
			ch <- e.emit("trace_step", decisionStep)

			msgs = e.contextManager.Trim(msgs)
		}

		ch <- e.emit("error", "max tool call rounds exceeded")
	}()

	return ch
}

// mergeToolCalls merges streamed tool call deltas into complete tool calls.
func mergeToolCalls(existing []llm.ToolCall, deltas []llm.ToolCall) []llm.ToolCall {
	for _, d := range deltas {
		idx := len(existing) - 1
		if d.Index != nil {
			idx = *d.Index
			for len(existing) <= idx {
				existing = append(existing, llm.ToolCall{})
			}
		} else if d.ID != "" {
			existing = append(existing, llm.ToolCall{})
			idx = len(existing) - 1
		} else if len(existing) == 0 {
			existing = append(existing, llm.ToolCall{})
			idx = 0
		}
		if idx < 0 || idx >= len(existing) {
			continue
		}

		current := &existing[idx]
		if d.Index != nil {
			current.Index = d.Index
		}
		if d.ID != "" {
			current.ID = d.ID
		}
		if d.Type != "" {
			current.Type = d.Type
		}
		if d.Function.Name != "" {
			current.Function.Name += d.Function.Name
		}
		if d.Function.Arguments != "" {
			current.Function.Arguments += d.Function.Arguments
		}
	}
	return existing
}
