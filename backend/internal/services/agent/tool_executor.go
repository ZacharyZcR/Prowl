package agent

import (
	"context"

	"github.com/ZacharyZcR/STC/backend/pkg/llm"
)

// ToolExecutor executes a tool call by name and returns the result.
type ToolExecutor interface {
	Execute(ctx context.Context, name string, arguments string) (string, error)
}

// ParseToolCalls extracts tool calls from a model response message.
func ParseToolCalls(msg llm.Message) []llm.ToolCall {
	return msg.ToolCalls
}

// BuildToolResultMessage creates a tool-role message to feed back to the model.
func BuildToolResultMessage(toolCallID, result string) llm.Message {
	return llm.Message{
		Role:       "tool",
		Content:    result,
		ToolCallID: toolCallID,
	}
}

// NoopExecutor returns a fixed message for unimplemented tools.
type NoopExecutor struct{}

func (e *NoopExecutor) Execute(_ context.Context, _ string, _ string) (string, error) {
	return `{"status":"ok","message":"tool not implemented"}`, nil
}

// CompositeExecutor routes tool calls to registered executors by prefix/name.
type CompositeExecutor struct {
	builtin  *BuiltinExecutor
	fallback ToolExecutor
}

func NewCompositeExecutor(builtin *BuiltinExecutor) *CompositeExecutor {
	return &CompositeExecutor{builtin: builtin, fallback: &NoopExecutor{}}
}

func (ce *CompositeExecutor) SetFallback(f ToolExecutor) {
	ce.fallback = f
}

func (ce *CompositeExecutor) Execute(ctx context.Context, name string, arguments string) (string, error) {
	if ce.builtin != nil && ce.builtin.Has(name) {
		return ce.builtin.Execute(ctx, name, arguments)
	}
	return ce.fallback.Execute(ctx, name, arguments)
}
