package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	baseURL    string
	token      string
	httpClient *http.Client
}

type APIResponse struct {
	Code    int             `json:"code"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
}

func New(baseURL, token string) *Client {
	return &Client{
		baseURL: baseURL,
		token:   token,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *Client) do(method, path string, body io.Reader) (*http.Response, error) {
	req, err := http.NewRequest(method, c.baseURL+path, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	return c.httpClient.Do(req)
}

func (c *Client) Get(path string) (*http.Response, error) {
	return c.do(http.MethodGet, path, nil)
}

func (c *Client) Post(path string, body io.Reader) (*http.Response, error) {
	return c.do(http.MethodPost, path, body)
}

func (c *Client) Put(path string, body io.Reader) (*http.Response, error) {
	return c.do(http.MethodPut, path, body)
}

func (c *Client) Delete(path string) (*http.Response, error) {
	return c.do(http.MethodDelete, path, nil)
}

func (c *Client) DoAPI(method, path string, body interface{}) (*APIResponse, error) {
	var reader io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshal request body: %w", err)
		}
		reader = bytes.NewReader(data)
	}

	resp, err := c.do(method, path, reader)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	var apiResp APIResponse
	if err := json.Unmarshal(raw, &apiResp); err != nil {
		return nil, fmt.Errorf("parse response: %w (body: %s)", err, string(raw))
	}

	if apiResp.Code != 0 {
		msg := apiResp.Message
		if msg == "" {
			msg = fmt.Sprintf("api error code %d", apiResp.Code)
		}
		return nil, fmt.Errorf("%s", msg)
	}

	return &apiResp, nil
}

func (c *Client) GetAPI(path string) (*APIResponse, error) {
	return c.DoAPI(http.MethodGet, path, nil)
}

func (c *Client) PostAPI(path string, body interface{}) (*APIResponse, error) {
	return c.DoAPI(http.MethodPost, path, body)
}

func (c *Client) PutAPI(path string, body interface{}) (*APIResponse, error) {
	return c.DoAPI(http.MethodPut, path, body)
}

func (c *Client) DeleteAPI(path string) (*APIResponse, error) {
	return c.DoAPI(http.MethodDelete, path, nil)
}

// RawGet returns the raw HTTP response for streaming use cases (e.g. SSE)
func (c *Client) RawGet(url string) (*http.Response, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	return c.httpClient.Do(req)
}

func (c *Client) BaseURL() string {
	return c.baseURL
}

func (c *Client) Token() string {
	return c.token
}
