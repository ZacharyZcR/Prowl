package logger

import (
	"strings"
	"sync"
)

type LogEntry struct {
	Timestamp string                 `json:"timestamp"`
	Level     string                 `json:"level"`
	Message   string                 `json:"message"`
	Caller    string                 `json:"caller,omitempty"`
	Fields    map[string]interface{} `json:"fields,omitempty"`
}

type LogBuffer struct {
	mu          sync.RWMutex
	entries     []LogEntry
	head        int
	count       int
	maxSize     int
	subscribers map[chan LogEntry]struct{}
}

var GlobalBuffer = NewLogBuffer(500)

func NewLogBuffer(maxSize int) *LogBuffer {
	return &LogBuffer{
		entries:     make([]LogEntry, maxSize),
		maxSize:     maxSize,
		subscribers: make(map[chan LogEntry]struct{}),
	}
}

func (b *LogBuffer) Write(entry LogEntry) {
	b.mu.Lock()
	b.entries[b.head] = entry
	b.head = (b.head + 1) % b.maxSize
	if b.count < b.maxSize {
		b.count++
	}
	subs := make([]chan LogEntry, 0, len(b.subscribers))
	for ch := range b.subscribers {
		subs = append(subs, ch)
	}
	b.mu.Unlock()

	for _, ch := range subs {
		select {
		case ch <- entry:
		default:
			// channel 满了就丢弃，不阻塞
		}
	}
}

func (b *LogBuffer) Recent(limit int) []LogEntry {
	b.mu.RLock()
	defer b.mu.RUnlock()

	n := b.count
	if limit > 0 && limit < n {
		n = limit
	}

	result := make([]LogEntry, n)
	start := (b.head - n + b.maxSize) % b.maxSize
	for i := 0; i < n; i++ {
		result[i] = b.entries[(start+i)%b.maxSize]
	}
	return result
}

func (b *LogBuffer) Subscribe() (chan LogEntry, func()) {
	ch := make(chan LogEntry, 256)
	b.mu.Lock()
	b.subscribers[ch] = struct{}{}
	b.mu.Unlock()

	return ch, func() {
		b.mu.Lock()
		delete(b.subscribers, ch)
		b.mu.Unlock()
	}
}

func (b *LogBuffer) Search(level, keyword string, limit int) []LogEntry {
	b.mu.RLock()
	defer b.mu.RUnlock()

	if limit <= 0 {
		limit = 100
	}

	level = strings.ToLower(level)
	keyword = strings.ToLower(keyword)

	var result []LogEntry
	start := (b.head - b.count + b.maxSize) % b.maxSize
	for i := 0; i < b.count && len(result) < limit; i++ {
		e := b.entries[(start+i)%b.maxSize]
		if level != "" && strings.ToLower(e.Level) != level {
			continue
		}
		if keyword != "" && !strings.Contains(strings.ToLower(e.Message), keyword) {
			continue
		}
		result = append(result, e)
	}
	return result
}
