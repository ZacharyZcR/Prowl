package services

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/robfig/cron/v3"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/cronjob"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type CronService struct {
	client   *ent.Client
	cron     *cron.Cron
	handlers map[string]func(ctx context.Context) error
	entries  map[int]cron.EntryID // db id -> cron entry id
	baseCtx  context.Context
	mu       sync.RWMutex
}

func NewCronService(client *ent.Client) *CronService {
	return &CronService{
		client:   client,
		cron:     cron.New(),
		handlers: make(map[string]func(ctx context.Context) error),
		entries:  make(map[int]cron.EntryID),
	}
}

func (s *CronService) RegisterHandler(name string, fn func(ctx context.Context) error) {
	s.handlers[name] = fn
}

func (s *CronService) EnsureBuiltin(ctx context.Context, name, cronExpr, handler string) {
	exists, _ := s.client.CronJob.Query().Where(cronjob.Handler(handler)).Exist(ctx)
	if !exists {
		_, _ = s.client.CronJob.Create().
			SetName(name).SetCronExpr(cronExpr).SetHandler(handler).SetEnabled(true).
			Save(ctx)
		log.Printf("cron: created builtin job %q (%s)", name, cronExpr)
	}
}

func (s *CronService) Start(ctx context.Context) error {
	s.mu.Lock()
	s.baseCtx = ctx
	s.mu.Unlock()

	jobs, err := s.client.CronJob.Query().
		Where(cronjob.Enabled(true)).
		All(ctx)
	if err != nil {
		return fmt.Errorf("load cron jobs: %w", err)
	}

	for _, job := range jobs {
		if err := s.scheduleJob(ctx, job); err != nil {
			log.Printf("cron: failed to schedule %s: %v", job.Name, err)
		}
	}

	s.cron.Start()
	log.Printf("cron: started with %d jobs", len(jobs))
	return nil
}

func (s *CronService) Stop() {
	s.cron.Stop()
}

func (s *CronService) scheduleJob(_ context.Context, job *ent.CronJob) error {
	handler, ok := s.handlers[job.Handler]
	if !ok {
		return fmt.Errorf("handler %q not registered", job.Handler)
	}

	jobID := job.ID
	entryID, err := s.cron.AddFunc(job.CronExpr, func() {
		s.runJob(s.jobContext(), jobID, handler)
	})
	if err != nil {
		return err
	}

	s.mu.Lock()
	s.entries[jobID] = entryID
	s.mu.Unlock()

	// Update next_run_at
	entry := s.cron.Entry(entryID)
	if !entry.Next.IsZero() {
		s.updateNextRun(jobID, entry.Next)
	}

	return nil
}

func (s *CronService) runJob(ctx context.Context, jobID int, handler func(ctx context.Context) error) {
	now := time.Now()
	err := handler(ctx)

	update := s.client.CronJob.UpdateOneID(jobID).
		SetLastRunAt(now)

	if err != nil {
		status := "failed"
		errMsg := err.Error()
		update = update.SetLastStatus(status).SetLastError(errMsg)
	} else {
		status := "success"
		update = update.SetLastStatus(status).ClearLastError()
	}

	// Update next_run_at
	s.mu.RLock()
	if eid, ok := s.entries[jobID]; ok {
		entry := s.cron.Entry(eid)
		if !entry.Next.IsZero() {
			update = update.SetNextRunAt(entry.Next)
		}
	}
	s.mu.RUnlock()

	updateCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := update.Exec(updateCtx); err != nil {
		log.Printf("cron: failed to update run status for job %d: %v", jobID, err)
	}
}

func (s *CronService) removeJob(jobID int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if eid, ok := s.entries[jobID]; ok {
		s.cron.Remove(eid)
		delete(s.entries, jobID)
	}
}

func (s *CronService) List(ctx context.Context) ([]*ent.CronJob, error) {
	items, err := s.client.CronJob.Query().
		Order(ent.Asc(cronjob.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list cron jobs: " + err.Error())
	}
	return items, nil
}

func (s *CronService) Create(ctx context.Context, req *models.CreateCronJobRequest) (*ent.CronJob, error) {
	// Validate handler exists
	if _, ok := s.handlers[req.Handler]; !ok {
		return nil, apperr.ErrBadRequest.WithMessage(fmt.Sprintf("handler %q not registered", req.Handler))
	}

	// Validate cron expression
	if _, err := cron.ParseStandard(req.CronExpr); err != nil {
		return nil, apperr.ErrBadRequest.WithMessage("invalid cron expression: " + err.Error())
	}

	builder := s.client.CronJob.Create().
		SetName(req.Name).
		SetCronExpr(req.CronExpr).
		SetHandler(req.Handler)

	if req.Enabled != nil {
		builder = builder.SetEnabled(*req.Enabled)
	}

	job, err := builder.Save(ctx)
	if err != nil {
		if ent.IsConstraintError(err) {
			return nil, apperr.ErrBadRequest.WithMessage("cron job name already exists")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to create cron job: " + err.Error())
	}

	if job.Enabled {
		if err := s.scheduleJob(ctx, job); err != nil {
			log.Printf("cron: failed to schedule new job %s: %v", job.Name, err)
		}
	}

	return job, nil
}

func (s *CronService) Update(ctx context.Context, id int, req *models.UpdateCronJobRequest) (*ent.CronJob, error) {
	builder := s.client.CronJob.UpdateOneID(id)

	if req.Name != nil {
		builder = builder.SetName(*req.Name)
	}
	if req.CronExpr != nil {
		if _, err := cron.ParseStandard(*req.CronExpr); err != nil {
			return nil, apperr.ErrBadRequest.WithMessage("invalid cron expression: " + err.Error())
		}
		builder = builder.SetCronExpr(*req.CronExpr)
	}
	if req.Handler != nil {
		if _, ok := s.handlers[*req.Handler]; !ok {
			return nil, apperr.ErrBadRequest.WithMessage(fmt.Sprintf("handler %q not registered", *req.Handler))
		}
		builder = builder.SetHandler(*req.Handler)
	}
	if req.Enabled != nil {
		builder = builder.SetEnabled(*req.Enabled)
	}

	job, err := builder.Save(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("cron job not found")
		}
		if ent.IsConstraintError(err) {
			return nil, apperr.ErrBadRequest.WithMessage("cron job name already exists")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to update cron job: " + err.Error())
	}

	// Reschedule
	s.removeJob(id)
	if job.Enabled {
		if err := s.scheduleJob(ctx, job); err != nil {
			log.Printf("cron: failed to reschedule job %s: %v", job.Name, err)
		}
	}

	return job, nil
}

func (s *CronService) Delete(ctx context.Context, id int) error {
	err := s.client.CronJob.DeleteOneID(id).Exec(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("cron job not found")
		}
		return apperr.ErrInternal.WithMessage("failed to delete cron job: " + err.Error())
	}
	s.removeJob(id)
	return nil
}

func (s *CronService) Toggle(ctx context.Context, id int) error {
	job, err := s.client.CronJob.Get(ctx, id)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("cron job not found")
		}
		return apperr.ErrInternal.WithMessage("failed to get cron job: " + err.Error())
	}

	newEnabled := !job.Enabled
	updated, err := s.client.CronJob.UpdateOneID(id).
		SetEnabled(newEnabled).
		Save(ctx)
	if err != nil {
		return apperr.ErrInternal.WithMessage("failed to toggle cron job: " + err.Error())
	}

	s.removeJob(id)
	if newEnabled {
		if err := s.scheduleJob(ctx, updated); err != nil {
			log.Printf("cron: failed to schedule toggled job %s: %v", updated.Name, err)
		}
	}

	return nil
}

func (s *CronService) RunNow(ctx context.Context, id int) error {
	job, err := s.client.CronJob.Get(ctx, id)
	if err != nil {
		if ent.IsNotFound(err) {
			return apperr.ErrNotFound.WithMessage("cron job not found")
		}
		return apperr.ErrInternal.WithMessage("failed to get cron job: " + err.Error())
	}

	handler, ok := s.handlers[job.Handler]
	if !ok {
		return apperr.ErrBadRequest.WithMessage(fmt.Sprintf("handler %q not registered", job.Handler))
	}

	go s.runJob(s.jobContext(), id, handler)
	return nil
}

func (s *CronService) jobContext() context.Context {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.baseCtx != nil {
		return s.baseCtx
	}
	return context.Background()
}

func (s *CronService) updateNextRun(jobID int, next time.Time) {
	updateCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := s.client.CronJob.UpdateOneID(jobID).
		SetNextRunAt(next).
		Exec(updateCtx); err != nil {
		log.Printf("cron: failed to update next_run_at for job %d: %v", jobID, err)
	}
}
