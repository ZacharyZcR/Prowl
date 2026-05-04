package agent

import (
	"fmt"
	"strings"

	"github.com/ZacharyZcR/STC/backend/pkg/llm"
)

// ReflectionLevel controls the depth of self-reflection.
type ReflectionLevel int

const (
	ReflectionNone  ReflectionLevel = iota
	ReflectionLight                 // tool failure -> inject error analysis hint
	ReflectionDeep                  // SPIN detected -> summarize + suggest alternatives
)

// ReflectionContext provides data for building reflection messages.
type ReflectionContext struct {
	FailedTool    string
	ErrorMsg      string
	SpinPattern   string
	RecentHistory []ActionRecord
	Round         int
}

// ReflectionCache stores recent reflections to prevent repeating mistakes.
type ReflectionCache struct {
	items []string
	max   int
}

func NewReflectionCache(max int) *ReflectionCache {
	if max <= 0 {
		max = 3
	}
	return &ReflectionCache{max: max}
}

func (c *ReflectionCache) Add(summary string) {
	if len(c.items) >= c.max {
		c.items = c.items[1:]
	}
	c.items = append(c.items, summary)
}

// BuildPromptSegment returns cached reflections formatted for prompt injection.
func (c *ReflectionCache) BuildPromptSegment() string {
	if len(c.items) == 0 {
		return ""
	}
	var sb strings.Builder
	sb.WriteString("[之前的反思记录，避免重复犯错]\n")
	for i, item := range c.items {
		sb.WriteString(fmt.Sprintf("%d. %s\n", i+1, item))
	}
	return sb.String()
}

// BuildReflection generates a reflection message to inject into the conversation.
func BuildReflection(level ReflectionLevel, ctx ReflectionContext) llm.Message {
	switch level {
	case ReflectionLight:
		return llm.Message{
			Role: "user",
			Content: fmt.Sprintf(
				"[反思] 工具 %s 执行失败: %s\n请分析失败原因，尝试不同的参数或换一个工具来完成目标。不要重复相同的调用。",
				ctx.FailedTool, ctx.ErrorMsg,
			),
		}
	case ReflectionDeep:
		return buildDeepReflection(ctx)
	default:
		return llm.Message{}
	}
}

func buildDeepReflection(ctx ReflectionContext) llm.Message {
	var sb strings.Builder
	sb.WriteString("[SPIN 检测] 检测到你可能陷入了循环。\n\n")
	sb.WriteString(fmt.Sprintf("模式: %s\n\n", ctx.SpinPattern))
	sb.WriteString("最近动作历史:\n")
	for i, r := range ctx.RecentHistory {
		status := "✓"
		if !r.Success {
			status = "✗"
		}
		sb.WriteString(fmt.Sprintf("  %d. [%s] %s (round %d)\n", i+1, status, r.ToolName, r.Round))
	}
	sb.WriteString("\n请停下来思考:\n")
	sb.WriteString("1. 当前方法为什么不奏效？\n")
	sb.WriteString("2. 有没有完全不同的方法可以尝试？\n")
	sb.WriteString("3. 是否需要放弃当前子目标，先完成其他部分？\n")
	sb.WriteString("4. 如果确实无法完成，请直接说明原因并停止。\n")
	return llm.Message{Role: "user", Content: sb.String()}
}

// ReflectionSummary extracts a one-line summary for caching.
func ReflectionSummary(level ReflectionLevel, ctx ReflectionContext) string {
	switch level {
	case ReflectionLight:
		msg := ctx.ErrorMsg
		if len(msg) > 80 {
			msg = msg[:80] + "..."
		}
		return fmt.Sprintf("工具 %s 失败: %s", ctx.FailedTool, msg)
	case ReflectionDeep:
		pat := ctx.SpinPattern
		if len(pat) > 80 {
			pat = pat[:80] + "..."
		}
		return fmt.Sprintf("SPIN: %s", pat)
	default:
		return ""
	}
}
