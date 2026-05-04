package queue

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/hibiken/asynq"
)

const DefaultQueue = "default"

// Task types
const (
	TypeExportUsers    = "export:users"
	TypeExportProjects = "export:projects"
	TypeExportRoles    = "export:roles"
	TypeImportUsers    = "import:users"
	TypeImportProjects = "import:projects"
	TypeDemo           = "demo"
)

// ExportPayload for async export tasks.
type ExportPayload struct {
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
}

// ImportPayload for async import tasks.
type ImportPayload struct {
	UserID  int    `json:"user_id"`
	Content []byte `json:"content"`
}

// DemoPayload for the demo sleep task.
type DemoPayload struct {
	Duration time.Duration `json:"duration"`
}

// TaskEvent for SSE broadcasting.
type TaskEvent struct {
	TaskID string `json:"task_id"`
	Name   string `json:"name"`
	Status string `json:"status"`
	Error  string `json:"error,omitempty"`
}

// Task represents a task for API responses.
type Task struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	Error     string    `json:"error,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	StartedAt time.Time `json:"started_at,omitempty"`
	DoneAt    time.Time `json:"done_at,omitempty"`
}

// QueueStats for API responses.
type QueueStats struct {
	Workers   int `json:"workers"`
	Pending   int `json:"pending"`
	Running   int `json:"running"`
	Completed int `json:"completed"`
	Failed    int `json:"failed"`
	Retry     int `json:"retry"`
}

// Queue wraps Asynq client, server, and inspector.
type Queue struct {
	client    *asynq.Client
	server    *asynq.Server
	inspector *asynq.Inspector
	mux       *asynq.ServeMux
	workers   int

	subMu       sync.Mutex
	subscribers map[chan TaskEvent]struct{}
}

// Config for queue initialization.
type Config struct {
	RedisAddr     string
	RedisPassword string
	Workers       int
}

// New creates a Queue backed by Asynq + Redis.
func New(cfg Config) *Queue {
	if cfg.Workers <= 0 {
		cfg.Workers = 3
	}

	redisOpt := asynq.RedisClientOpt{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
	}

	q := &Queue{
		client:      asynq.NewClient(redisOpt),
		inspector:   asynq.NewInspector(redisOpt),
		mux:         asynq.NewServeMux(),
		workers:     cfg.Workers,
		subscribers: make(map[chan TaskEvent]struct{}),
	}

	q.server = asynq.NewServer(redisOpt, asynq.Config{
		Concurrency: cfg.Workers,
		Queues:      map[string]int{DefaultQueue: 1},
		ErrorHandler: asynq.ErrorHandlerFunc(func(ctx context.Context, task *asynq.Task, err error) {
			id, _ := asynq.GetTaskID(ctx)
			q.broadcast(TaskEvent{TaskID: id, Name: task.Type(), Status: "failed", Error: err.Error()})
		}),
	})

	return q
}

// HandleFunc registers a handler for a task type.
// The wrapper broadcasts SSE events on start and completion.
func (q *Queue) HandleFunc(taskType string, handler func(context.Context, *asynq.Task) error) {
	q.mux.HandleFunc(taskType, func(ctx context.Context, t *asynq.Task) error {
		id, _ := asynq.GetTaskID(ctx)
		q.broadcast(TaskEvent{TaskID: id, Name: t.Type(), Status: "running"})

		err := handler(ctx, t)
		if err == nil {
			q.broadcast(TaskEvent{TaskID: id, Name: t.Type(), Status: "completed"})
		}
		return err
	})
}

// Enqueue adds a task with a JSON-serializable payload.
func (q *Queue) Enqueue(taskType string, payload any, opts ...asynq.Option) (string, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	defaults := []asynq.Option{
		asynq.Queue(DefaultQueue),
		asynq.MaxRetry(3),
		asynq.Retention(24 * time.Hour),
	}

	info, err := q.client.Enqueue(asynq.NewTask(taskType, data), append(defaults, opts...)...)
	if err != nil {
		return "", err
	}

	q.broadcast(TaskEvent{TaskID: info.ID, Name: taskType, Status: "pending"})
	return info.ID, nil
}

// TryEnqueue is an alias for Enqueue. Asynq is Redis-backed, so it won't block.
func (q *Queue) TryEnqueue(taskType string, payload any, opts ...asynq.Option) (string, error) {
	return q.Enqueue(taskType, payload, opts...)
}

// Start starts the Asynq worker server. Blocks until Stop or error.
func (q *Queue) Start() error {
	return q.server.Start(q.mux)
}

// Stop gracefully shuts down the worker server and closes connections.
func (q *Queue) Stop() {
	q.server.Stop()
	q.client.Close()
	q.inspector.Close()
}

// Stats returns queue statistics.
func (q *Queue) Stats() QueueStats {
	info, err := q.inspector.GetQueueInfo(DefaultQueue)
	if err != nil {
		return QueueStats{Workers: q.workers}
	}
	return QueueStats{
		Workers:   q.workers,
		Pending:   info.Pending,
		Running:   info.Active,
		Completed: info.Completed,
		Failed:    info.Archived,
		Retry:     info.Retry,
	}
}

// ListRecent returns recent tasks across all states.
func (q *Queue) ListRecent(limit int) []*Task {
	var result []*Task
	page := asynq.PageSize(limit)

	if tasks, err := q.inspector.ListActiveTasks(DefaultQueue, page); err == nil {
		for _, t := range tasks {
			result = append(result, taskInfoToTask(t, "running"))
		}
	}
	if tasks, err := q.inspector.ListPendingTasks(DefaultQueue, page); err == nil {
		for _, t := range tasks {
			result = append(result, taskInfoToTask(t, "pending"))
		}
	}
	if tasks, err := q.inspector.ListCompletedTasks(DefaultQueue, page); err == nil {
		for _, t := range tasks {
			result = append(result, taskInfoToTask(t, "completed"))
		}
	}
	if tasks, err := q.inspector.ListArchivedTasks(DefaultQueue, page); err == nil {
		for _, t := range tasks {
			result = append(result, taskInfoToTask(t, "failed"))
		}
	}

	if len(result) > limit {
		result = result[:limit]
	}
	return result
}

// Status returns a single task by ID, or nil if not found.
func (q *Queue) Status(id string) *Task {
	info, err := q.inspector.GetTaskInfo(DefaultQueue, id)
	if err != nil {
		return nil
	}
	status := "pending"
	switch info.State {
	case asynq.TaskStateActive:
		status = "running"
	case asynq.TaskStateCompleted:
		status = "completed"
	case asynq.TaskStateArchived:
		status = "failed"
	case asynq.TaskStateRetry:
		status = "retry"
	case asynq.TaskStateScheduled:
		status = "scheduled"
	}
	return taskInfoToTask(info, status)
}

func taskInfoToTask(info *asynq.TaskInfo, status string) *Task {
	t := &Task{
		ID:     info.ID,
		Name:   info.Type,
		Status: status,
	}
	if !info.NextProcessAt.IsZero() {
		t.CreatedAt = info.NextProcessAt
	}
	if info.LastErr != "" {
		t.Error = info.LastErr
	}
	if !info.CompletedAt.IsZero() {
		t.DoneAt = info.CompletedAt
	}
	return t
}

// Subscribe returns a channel that receives task lifecycle events.
func (q *Queue) Subscribe() (chan TaskEvent, func()) {
	ch := make(chan TaskEvent, 64)
	q.subMu.Lock()
	q.subscribers[ch] = struct{}{}
	q.subMu.Unlock()

	unsub := func() {
		q.subMu.Lock()
		if _, ok := q.subscribers[ch]; ok {
			delete(q.subscribers, ch)
			close(ch)
		}
		q.subMu.Unlock()
	}
	return ch, unsub
}

func (q *Queue) broadcast(event TaskEvent) {
	q.subMu.Lock()
	defer q.subMu.Unlock()
	for ch := range q.subscribers {
		select {
		case ch <- event:
		default:
		}
	}
}
