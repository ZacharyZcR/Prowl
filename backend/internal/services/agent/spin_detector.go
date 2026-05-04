package agent

import (
	"fmt"
	"hash/fnv"
	"strings"
)

// SpinDetector detects when an agent is stuck in a loop calling the same tools.
type SpinDetector struct {
	window  int
	history []ActionRecord
	spun    bool
}

// ActionRecord captures a single tool invocation for spin analysis.
type ActionRecord struct {
	ToolName string
	ArgsHash uint64
	Success  bool
	Round    int
}

func NewSpinDetector(window int) *SpinDetector {
	if window < 2 {
		window = 3
	}
	return &SpinDetector{window: window}
}

// Record adds a tool call to the history.
func (d *SpinDetector) Record(toolName string, args string, success bool, round int) {
	d.history = append(d.history, ActionRecord{
		ToolName: toolName,
		ArgsHash: hashArgs(args),
		Success:  success,
		Round:    round,
	})
}

// Check performs spin detection: same tool+args or all failures.
func (d *SpinDetector) Check() (bool, string) {
	n := len(d.history)
	if n < d.window {
		return false, ""
	}

	recent := d.history[n-d.window:]
	firstName := recent[0].ToolName
	allSameName := true
	for _, r := range recent[1:] {
		if r.ToolName != firstName {
			allSameName = false
			break
		}
	}
	if !allSameName {
		return false, ""
	}

	// Same tool + same args
	firstHash := recent[0].ArgsHash
	allSameArgs := true
	for _, r := range recent[1:] {
		if r.ArgsHash != firstHash {
			allSameArgs = false
			break
		}
	}
	if allSameArgs {
		return true, fmt.Sprintf("连续 %d 次调用 %s，参数完全相同", d.window, firstName)
	}

	// Same tool + all failed
	allFailed := true
	for _, r := range recent {
		if r.Success {
			allFailed = false
			break
		}
	}
	if allFailed {
		return true, fmt.Sprintf("连续 %d 次调用 %s 均失败", d.window, firstName)
	}

	return false, ""
}

// WasSpun returns true if SPIN was previously detected.
func (d *SpinDetector) WasSpun() bool { return d.spun }

// MarkSpun records that a SPIN was detected.
func (d *SpinDetector) MarkSpun() { d.spun = true }

// RecentHistory returns the last N action records.
func (d *SpinDetector) RecentHistory(n int) []ActionRecord {
	if n > len(d.history) {
		n = len(d.history)
	}
	return d.history[len(d.history)-n:]
}

func hashArgs(args string) uint64 {
	s := strings.TrimSpace(strings.ToLower(args))
	h := fnv.New64a()
	h.Write([]byte(s))
	return h.Sum64()
}
