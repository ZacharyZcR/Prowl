package services

import (
	"context"
	"log"
	"sync"
	"time"
)

// Notifier 统一通知渠道接口
type Notifier interface {
	Send(ctx context.Context, to, title, content string) error
	Name() string
}

// NotificationDispatcher 通知分发器，将消息分发到所有已注册渠道
type NotificationDispatcher struct {
	mu       sync.RWMutex
	channels []Notifier
}

func NewNotificationDispatcher() *NotificationDispatcher {
	return &NotificationDispatcher{}
}

func (d *NotificationDispatcher) Register(n Notifier) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.channels = append(d.channels, n)
}

// Dispatch 异步分发通知到所有渠道
func (d *NotificationDispatcher) Dispatch(ctx context.Context, to, title, content string) {
	channels := d.snapshot()
	go d.dispatch(context.WithoutCancel(ctx), channels, to, title, content)
}

func (d *NotificationDispatcher) snapshot() []Notifier {
	d.mu.RLock()
	defer d.mu.RUnlock()

	channels := make([]Notifier, len(d.channels))
	copy(channels, d.channels)
	return channels
}

func (d *NotificationDispatcher) dispatch(baseCtx context.Context, channels []Notifier, to, title, content string) {
	for _, ch := range channels {
		sendCtx, cancel := context.WithTimeout(baseCtx, 5*time.Second)
		err := ch.Send(sendCtx, to, title, content)
		cancel()
		if err != nil {
			log.Printf("notifier %s failed: %v", ch.Name(), err)
		}
	}
}
