package llm

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"math/rand/v2"
	"net/http"
	"strings"
	"time"
)

// OpenAIProvider implements Provider for any OpenAI-compatible API.
type OpenAIProvider struct {
	name    string
	baseURL string
	apiKey  string
	client  *http.Client
}

func NewOpenAIProvider(name, baseURL, apiKey string) *OpenAIProvider {
	return &OpenAIProvider{
		name:    name,
		baseURL: strings.TrimRight(baseURL, "/"),
		apiKey:  apiKey,
		client:  &http.Client{},
	}
}

func (p *OpenAIProvider) Name() string { return p.name }

type openaiRequest struct {
	Model       string   `json:"model"`
	Messages    []Message `json:"messages"`
	Tools       []Tool   `json:"tools,omitempty"`
	Stream      bool     `json:"stream"`
	Temperature *float64 `json:"temperature,omitempty"`
	MaxTokens   *int     `json:"max_tokens,omitempty"`
	TopP        *float64 `json:"top_p,omitempty"`
}

type openaiResponse struct {
	ID      string `json:"id"`
	Model   string `json:"model"`
	Choices []struct {
		Message      Message `json:"message"`
		FinishReason string  `json:"finish_reason"`
	} `json:"choices"`
	Usage Usage `json:"usage"`
}

type openaiStreamChunk struct {
	ID      string `json:"id"`
	Choices []struct {
		Delta        ChunkDelta `json:"delta"`
		FinishReason *string    `json:"finish_reason"`
	} `json:"choices"`
	Usage *Usage `json:"usage,omitempty"`
}

const maxRetries = 3

func (p *OpenAIProvider) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	body := openaiRequest{
		Model:       req.Model,
		Messages:    req.Messages,
		Tools:       req.Tools,
		Stream:      false,
		Temperature: req.Temperature,
		MaxTokens:   req.MaxTokens,
		TopP:        req.TopP,
	}

	var lastErr error
	for attempt := range maxRetries {
		if attempt > 0 {
			delay := retryDelay(attempt)
			select {
			case <-time.After(delay):
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}

		resp, err := p.doRequest(ctx, body)
		if err != nil {
			lastErr = err
			continue
		}

		if resp.StatusCode != http.StatusOK {
			respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
			resp.Body.Close()
			apiErr := &APIError{StatusCode: resp.StatusCode, Body: string(respBody)}
			if !isRetryable(resp.StatusCode) {
				return nil, apiErr
			}
			lastErr = apiErr
			continue
		}

		defer resp.Body.Close()
		var result openaiResponse
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			return nil, fmt.Errorf("decode response: %w", err)
		}
		if len(result.Choices) == 0 {
			return nil, fmt.Errorf("empty choices in response")
		}
		msg := result.Choices[0].Message
		if msg.Content == "" && msg.ReasoningContent != "" {
			msg.Content = msg.ReasoningContent
		}
		return &ChatResponse{
			ID:      result.ID,
			Model:   result.Model,
			Message: msg,
			Usage:   result.Usage,
		}, nil
	}
	return nil, lastErr
}

func (p *OpenAIProvider) ChatStream(ctx context.Context, req ChatRequest) (<-chan StreamChunk, error) {
	body := openaiRequest{
		Model:       req.Model,
		Messages:    req.Messages,
		Tools:       req.Tools,
		Stream:      true,
		Temperature: req.Temperature,
		MaxTokens:   req.MaxTokens,
		TopP:        req.TopP,
	}

	var lastErr error
	for attempt := range maxRetries {
		if attempt > 0 {
			delay := retryDelay(attempt)
			select {
			case <-time.After(delay):
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}

		resp, err := p.doRequest(ctx, body)
		if err != nil {
			lastErr = err
			continue
		}

		if resp.StatusCode != http.StatusOK {
			respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
			resp.Body.Close()
			apiErr := &APIError{StatusCode: resp.StatusCode, Body: string(respBody)}
			if !isRetryable(resp.StatusCode) {
				return nil, apiErr
			}
			lastErr = apiErr
			continue
		}

		ch := make(chan StreamChunk, 32)
		go func() {
			defer close(ch)
			defer resp.Body.Close()
			consumeStream(ctx, resp.Body, ch)
		}()
		return ch, nil
	}
	return nil, lastErr
}

func (p *OpenAIProvider) doRequest(ctx context.Context, body any) (*http.Response, error) {
	data, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL+"/chat/completions", bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)

	return p.client.Do(httpReq)
}

func consumeStream(ctx context.Context, r io.Reader, ch chan<- StreamChunk) {
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 0, 64*1024), 10*1024*1024)
	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return
		default:
		}

		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		data := strings.TrimPrefix(line, "data: ")
		if data == "[DONE]" {
			return
		}

		var chunk openaiStreamChunk
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			ch <- StreamChunk{Err: fmt.Errorf("decode chunk: %w", err)}
			return
		}
		if len(chunk.Choices) == 0 {
			continue
		}

		ch <- StreamChunk{
			ID:    chunk.ID,
			Delta: chunk.Choices[0].Delta,
			Usage: chunk.Usage,
		}
	}
	if err := scanner.Err(); err != nil {
		ch <- StreamChunk{Err: fmt.Errorf("read stream: %w", err)}
	}
}

func isRetryable(code int) bool {
	return code == 429 || code == 529 || code >= 500
}

func retryDelay(attempt int) time.Duration {
	base := 500 * time.Millisecond * time.Duration(math.Pow(2, float64(attempt)))
	if base > 16*time.Second {
		base = 16 * time.Second
	}
	jitter := time.Duration(rand.Int64N(int64(base) / 4))
	return base + jitter
}
