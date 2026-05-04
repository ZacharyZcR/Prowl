package agent

import (
	"fmt"

	"github.com/ZacharyZcR/STC/backend/pkg/llm"
)

const defaultMaxTokens = 128000

// ContextManager handles message list assembly, trimming, and micro-compaction.
type ContextManager struct {
	maxTokens int
}

func NewContextManager(maxTokens int) *ContextManager {
	if maxTokens <= 0 {
		maxTokens = defaultMaxTokens
	}
	return &ContextManager{maxTokens: maxTokens}
}

// Build assembles the message list: system prompt + history + new messages.
func (cm *ContextManager) Build(systemPrompt string, history []llm.Message, newMessages []llm.Message) []llm.Message {
	var msgs []llm.Message
	if systemPrompt != "" {
		msgs = append(msgs, llm.Message{Role: "system", Content: systemPrompt})
	}
	msgs = append(msgs, history...)
	msgs = append(msgs, newMessages...)
	return cm.Trim(msgs)
}

// Trim reduces message list to fit within token limit by dropping old messages.
func (cm *ContextManager) Trim(msgs []llm.Message) []llm.Message {
	total := estimateTokens(msgs)
	if total <= cm.maxTokens || len(msgs) <= 2 {
		return msgs
	}
	return cm.truncate(msgs)
}

const keepTailCount = 5

func (cm *ContextManager) truncate(msgs []llm.Message) []llm.Message {
	costs := make([]int, len(msgs))
	for i, m := range msgs {
		costs[i] = msgTokens(m)
	}

	keepFirst := msgs[0].Role == "system"
	kept := 0
	minIdx := 0
	if keepFirst {
		kept = costs[0]
		minIdx = 1
	}

	cutIdx := len(msgs)
	for i := len(msgs) - 1; i >= minIdx; i-- {
		if kept+costs[i] > cm.maxTokens {
			break
		}
		kept += costs[i]
		cutIdx = i
	}

	if cutIdx <= minIdx {
		cutIdx = len(msgs) - 1
	}

	result := make([]llm.Message, 0, len(msgs)-cutIdx+1)
	if keepFirst {
		result = append(result, msgs[0])
	}
	result = append(result, msgs[cutIdx:]...)
	return result
}

const (
	microcompactThreshold  = 16000
	microcompactKeepRecent = 3
)

// Microcompact truncates old, oversized tool results without calling LLM.
func (cm *ContextManager) Microcompact(msgs []llm.Message) []llm.Message {
	var toolIndices []int
	for i, m := range msgs {
		if m.Role == "tool" {
			toolIndices = append(toolIndices, i)
		}
	}
	if len(toolIndices) <= microcompactKeepRecent {
		return msgs
	}

	truncateSet := make(map[int]bool)
	cutoff := len(toolIndices) - microcompactKeepRecent
	for _, idx := range toolIndices[:cutoff] {
		truncateSet[idx] = true
	}

	result := make([]llm.Message, len(msgs))
	copy(result, msgs)
	for i, m := range result {
		if !truncateSet[i] || len(m.Content) <= microcompactThreshold {
			continue
		}
		headKeep := microcompactThreshold * 3 / 4
		tailKeep := microcompactThreshold - headKeep
		result[i] = llm.Message{
			Role:    m.Role,
			Content: m.Content[:headKeep] + fmt.Sprintf("\n[... 省略 %d 字符 ...]\n", len(m.Content)-microcompactThreshold) + m.Content[len(m.Content)-tailKeep:],
		}
	}
	return result
}

func estimateTokens(msgs []llm.Message) int {
	total := 0
	for _, m := range msgs {
		total += msgTokens(m)
	}
	return total
}

func msgTokens(m llm.Message) int {
	t := estimateTextTokens(m.Content) + 4
	for _, tc := range m.ToolCalls {
		t += estimateTextTokens(tc.Function.Arguments) + 10
	}
	return t
}

// estimateTextTokens provides a rough token count for mixed CJK/Latin text.
func estimateTextTokens(s string) int {
	cjk, other := 0, 0
	for _, r := range s {
		if r >= 0x2E80 && r <= 0x9FFF || r >= 0xF900 && r <= 0xFAFF {
			cjk++
		} else {
			other++
		}
	}
	return cjk + other/4
}
