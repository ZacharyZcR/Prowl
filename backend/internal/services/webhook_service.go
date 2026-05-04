package services

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/webhook"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type WebhookService struct {
	client     *ent.Client
	httpClient *http.Client
}

func NewWebhookService(client *ent.Client) *WebhookService {
	return NewWebhookServiceWithHTTPClient(client, nil)
}

func NewWebhookServiceWithHTTPClient(client *ent.Client, httpClient *http.Client) *WebhookService {
	if httpClient == nil {
		httpClient = newExternalHTTPClient(10 * time.Second)
	}
	return &WebhookService{client: client, httpClient: httpClient}
}

func (s *WebhookService) List(ctx context.Context) ([]*ent.Webhook, error) {
	items, err := s.client.Webhook.Query().
		Order(ent.Desc(webhook.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list webhooks: " + err.Error())
	}
	return items, nil
}

func (s *WebhookService) GetByID(ctx context.Context, id int) (*ent.Webhook, error) {
	w, err := s.client.Webhook.Get(ctx, id)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("webhook not found")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to get webhook: " + err.Error())
	}
	return w, nil
}

func (s *WebhookService) Create(ctx context.Context, req *models.CreateWebhookRequest) (*ent.Webhook, error) {
	builder := s.client.Webhook.Create().
		SetName(req.Name).
		SetURL(req.URL).
		SetEvents(req.Events)

	if req.Secret != "" {
		builder = builder.SetSecret(req.Secret)
	}
	if req.Headers != nil {
		builder = builder.SetHeaders(req.Headers)
	}

	w, err := builder.Save(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to create webhook: " + err.Error())
	}
	return w, nil
}

func (s *WebhookService) Update(ctx context.Context, id int, req *models.UpdateWebhookRequest) (*ent.Webhook, error) {
	builder := s.client.Webhook.UpdateOneID(id)

	if req.Name != nil {
		builder = builder.SetName(*req.Name)
	}
	if req.URL != nil {
		builder = builder.SetURL(*req.URL)
	}
	if req.Secret != nil {
		if *req.Secret == "" {
			builder = builder.ClearSecret()
		} else {
			builder = builder.SetSecret(*req.Secret)
		}
	}
	if req.Events != nil {
		builder = builder.SetEvents(*req.Events)
	}
	if req.Headers != nil {
		builder = builder.SetHeaders(*req.Headers)
	}

	w, err := builder.Save(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("webhook not found")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to update webhook: " + err.Error())
	}
	return w, nil
}

func (s *WebhookService) Delete(ctx context.Context, id int) error {
	err := s.client.Webhook.DeleteOneID(id).Exec(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("webhook not found")
		}
		return apperr.ErrInternal.WithMessage("failed to delete webhook: " + err.Error())
	}
	return nil
}

func (s *WebhookService) Toggle(ctx context.Context, id int) error {
	w, err := s.client.Webhook.Get(ctx, id)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("webhook not found")
		}
		return apperr.ErrInternal.WithMessage("failed to get webhook: " + err.Error())
	}

	_, err = s.client.Webhook.UpdateOneID(id).
		SetEnabled(!w.Enabled).
		Save(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to toggle webhook: " + err.Error())
	}
	return nil
}

func (s *WebhookService) Test(ctx context.Context, id int) (*models.TestResult, error) {
	w, err := s.client.Webhook.Get(ctx, id)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("webhook not found")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to get webhook: " + err.Error())
	}

	payload := map[string]interface{}{
		"event":     "webhook.test",
		"timestamp": time.Now().Format(time.RFC3339),
		"data":      map[string]string{"message": "This is a test webhook delivery"},
	}

	result, err := s.deliver(w, payload)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to send test webhook: " + err.Error())
	}

	return result, nil
}

func (s *WebhookService) Trigger(ctx context.Context, event string, payload interface{}) {
	webhooks, err := s.client.Webhook.Query().
		Where(webhook.Enabled(true)).
		All(ctx)
	if err != nil {
		return
	}

	envelope := map[string]interface{}{
		"event":     event,
		"timestamp": time.Now().Format(time.RFC3339),
		"data":      payload,
	}

	for _, w := range webhooks {
		if !containsEvent(w.Events, event) {
			continue
		}
		go func(wh *ent.Webhook) {
			result, err := s.deliver(wh, envelope)
			now := time.Now()
			update := s.client.Webhook.UpdateOneID(wh.ID).
				SetLastTriggeredAt(now)

			if err != nil {
				update = update.AddFailureCount(1)
			} else {
				update = update.SetLastStatusCode(result.StatusCode)
				if result.StatusCode >= 300 {
					update = update.AddFailureCount(1)
				} else {
					update = update.SetFailureCount(0)
				}
			}

			updateCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			_ = update.Exec(updateCtx)
		}(w)
	}
}

func (s *WebhookService) deliver(w *ent.Webhook, payload interface{}) (*models.TestResult, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal payload: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, w.URL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Prowl-Webhook/1.0")

	if w.Secret != "" {
		mac := hmac.New(sha256.New, []byte(w.Secret))
		mac.Write(body)
		sig := hex.EncodeToString(mac.Sum(nil))
		req.Header.Set("X-Webhook-Signature", sig)
	}

	for k, v := range w.Headers {
		req.Header.Set(k, v)
	}

	start := time.Now()
	resp, err := s.httpClient.Do(req)
	duration := time.Since(start)

	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))

	return &models.TestResult{
		StatusCode:   resp.StatusCode,
		ResponseBody: string(respBody),
		Duration:     duration.String(),
	}, nil
}

func containsEvent(events []string, event string) bool {
	for _, e := range events {
		if e == event {
			return true
		}
	}
	return false
}
