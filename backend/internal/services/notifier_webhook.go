package services

import "context"

// WebhookNotifier 通过 Webhook 发送通知
type WebhookNotifier struct {
	WebhookService *WebhookService
}

func (n *WebhookNotifier) Name() string { return "webhook" }

func (n *WebhookNotifier) Send(ctx context.Context, to, title, content string) error {
	n.WebhookService.Trigger(ctx, "notification.create", map[string]string{
		"to":      to,
		"title":   title,
		"content": content,
	})
	return nil
}
