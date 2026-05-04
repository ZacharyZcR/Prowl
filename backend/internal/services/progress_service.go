package services

import (
	"crypto/rand"
	"fmt"
	"sync"
	"time"

	"github.com/ZacharyZcR/STC/backend/internal/server"
)

type ProgressEvent struct {
	TaskID      string  `json:"task_id"`
	Label       string  `json:"label"`
	Current     int     `json:"current"`
	Total       int     `json:"total"`
	Percent     float64 `json:"percent"`
	Status      string  `json:"status"` // running, completed, failed
	Error       string  `json:"error,omitempty"`
	DownloadURL string  `json:"download_url,omitempty"`
}

type ProgressTracker struct {
	broker *server.SSEBroker
	mu     sync.RWMutex
	active map[string]*ProgressEvent
}

func NewProgressTracker(broker *server.SSEBroker) *ProgressTracker {
	return &ProgressTracker{
		broker: broker,
		active: make(map[string]*ProgressEvent),
	}
}

func (p *ProgressTracker) Start(userID int, label string, total int) string {
	taskID := generateProgressID()
	evt := &ProgressEvent{
		TaskID:  taskID,
		Label:   label,
		Current: 0,
		Total:   total,
		Percent: 0,
		Status:  "running",
	}

	p.mu.Lock()
	p.active[taskID] = evt
	p.mu.Unlock()

	p.send(userID, evt)
	return taskID
}

func (p *ProgressTracker) Update(userID int, taskID string, current int) {
	p.mu.Lock()
	evt, ok := p.active[taskID]
	if !ok {
		p.mu.Unlock()
		return
	}
	evt.Current = current
	if evt.Total > 0 {
		evt.Percent = float64(current) / float64(evt.Total) * 100
	}
	snapshot := *evt
	p.mu.Unlock()

	p.send(userID, &snapshot)
}

func (p *ProgressTracker) Complete(userID int, taskID string, downloadURL string) {
	p.mu.Lock()
	evt, ok := p.active[taskID]
	if !ok {
		p.mu.Unlock()
		return
	}
	evt.Current = evt.Total
	evt.Percent = 100
	evt.Status = "completed"
	evt.DownloadURL = downloadURL
	snapshot := *evt
	delete(p.active, taskID)
	p.mu.Unlock()

	p.send(userID, &snapshot)
}

func (p *ProgressTracker) Fail(userID int, taskID string, errMsg string) {
	p.mu.Lock()
	evt, ok := p.active[taskID]
	if !ok {
		p.mu.Unlock()
		return
	}
	evt.Status = "failed"
	evt.Error = errMsg
	snapshot := *evt
	delete(p.active, taskID)
	p.mu.Unlock()

	p.send(userID, &snapshot)
}

func (p *ProgressTracker) send(userID int, evt *ProgressEvent) {
	p.broker.SendToUser(userID, server.SSEEvent{
		Event: "progress",
		Data:  evt,
	})
}

func generateProgressID() string {
	b := make([]byte, 6)
	rand.Read(b)
	return fmt.Sprintf("prog_%d_%x", time.Now().UnixMilli(), b)
}
