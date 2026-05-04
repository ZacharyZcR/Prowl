package server

import (
	"sync"
)

type SSEBroker struct {
	clients map[chan SSEEvent]SSEClientInfo
	mu      sync.RWMutex
}

type SSEClientInfo struct {
	UserID   int
	Username string
}

type SSEEvent struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
	ID    string      `json:"id,omitempty"`
}

func NewSSEBroker() *SSEBroker {
	return &SSEBroker{
		clients: make(map[chan SSEEvent]SSEClientInfo),
	}
}

func (b *SSEBroker) Subscribe(userID int, username string) (chan SSEEvent, func()) {
	ch := make(chan SSEEvent, 256)
	b.mu.Lock()
	b.clients[ch] = SSEClientInfo{UserID: userID, Username: username}
	b.mu.Unlock()

	unsubscribe := func() {
		b.mu.Lock()
		delete(b.clients, ch)
		close(ch)
		b.mu.Unlock()
	}
	return ch, unsubscribe
}

func (b *SSEBroker) Broadcast(event SSEEvent) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	for ch := range b.clients {
		select {
		case ch <- event:
		default:
		}
	}
}

func (b *SSEBroker) SendToUser(userID int, event SSEEvent) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	for ch, info := range b.clients {
		if info.UserID == userID {
			select {
			case ch <- event:
			default:
			}
		}
	}
}
