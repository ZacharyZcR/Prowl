package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/hibiken/asynq"

	"github.com/ZacharyZcR/STC/backend/internal/queue"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type DataHandler struct {
	exportService *services.ExportService
	importService *services.ImportService
	uploadService *services.UploadService
	progress      *services.ProgressTracker
	taskQueue     *queue.Queue
}

func NewDataHandler(
	exportService *services.ExportService,
	importService *services.ImportService,
	uploadService *services.UploadService,
	progress *services.ProgressTracker,
	taskQueue *queue.Queue,
) *DataHandler {
	return &DataHandler{
		exportService: exportService,
		importService: importService,
		uploadService: uploadService,
		progress:      progress,
		taskQueue:     taskQueue,
	}
}

// RegisterTaskHandlers registers Asynq task handlers on the queue.
// Must be called before queue.Start().
func (h *DataHandler) RegisterTaskHandlers() {
	h.taskQueue.HandleFunc(queue.TypeExportUsers, h.handleExportUsers)
	h.taskQueue.HandleFunc(queue.TypeExportProjects, h.handleExportProjects)
	h.taskQueue.HandleFunc(queue.TypeExportRoles, h.handleExportRoles)
	h.taskQueue.HandleFunc(queue.TypeImportUsers, h.handleImportUsers)
	h.taskQueue.HandleFunc(queue.TypeImportProjects, h.handleImportProjects)
	h.taskQueue.HandleFunc(queue.TypeDemo, h.handleDemo)
}

// --- Asynq task handlers ---

func (h *DataHandler) handleExportUsers(ctx context.Context, t *asynq.Task) error {
	var p queue.ExportPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return err
	}

	filename := fmt.Sprintf("users_%s.csv", time.Now().Format("20060102_150405"))
	taskID := h.progress.Start(p.UserID, "Exporting users", 0)

	data, err := h.exportService.ExportUsersWithProgress(ctx, func(current, total int) {
		h.progress.Update(p.UserID, taskID, current)
	})
	if err != nil {
		h.progress.Fail(p.UserID, taskID, err.Error())
		return err
	}

	record, err := h.uploadService.SaveGeneratedFile(ctx, filename, data, "text/csv; charset=utf-8", p.UserID, p.Username)
	if err != nil {
		h.progress.Fail(p.UserID, taskID, "failed to save file")
		return err
	}

	h.progress.Complete(p.UserID, taskID, "/uploads/"+record.Path)
	return nil
}

func (h *DataHandler) handleExportProjects(ctx context.Context, t *asynq.Task) error {
	var p queue.ExportPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return err
	}

	filename := fmt.Sprintf("projects_%s.csv", time.Now().Format("20060102_150405"))
	taskID := h.progress.Start(p.UserID, "Exporting projects", 0)

	data, err := h.exportService.ExportProjectsWithProgress(ctx, func(current, total int) {
		h.progress.Update(p.UserID, taskID, current)
	})
	if err != nil {
		h.progress.Fail(p.UserID, taskID, err.Error())
		return err
	}

	record, err := h.uploadService.SaveGeneratedFile(ctx, filename, data, "text/csv; charset=utf-8", p.UserID, p.Username)
	if err != nil {
		h.progress.Fail(p.UserID, taskID, "failed to save file")
		return err
	}

	h.progress.Complete(p.UserID, taskID, "/uploads/"+record.Path)
	return nil
}

func (h *DataHandler) handleExportRoles(ctx context.Context, t *asynq.Task) error {
	var p queue.ExportPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return err
	}

	filename := fmt.Sprintf("roles_%s.csv", time.Now().Format("20060102_150405"))
	taskID := h.progress.Start(p.UserID, "Exporting roles", 0)

	data, err := h.exportService.ExportRolesWithProgress(ctx, func(current, total int) {
		h.progress.Update(p.UserID, taskID, current)
	})
	if err != nil {
		h.progress.Fail(p.UserID, taskID, err.Error())
		return err
	}

	record, err := h.uploadService.SaveGeneratedFile(ctx, filename, data, "text/csv; charset=utf-8", p.UserID, p.Username)
	if err != nil {
		h.progress.Fail(p.UserID, taskID, "failed to save file")
		return err
	}

	h.progress.Complete(p.UserID, taskID, "/uploads/"+record.Path)
	return nil
}

func (h *DataHandler) handleImportUsers(ctx context.Context, t *asynq.Task) error {
	var p queue.ImportPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return err
	}

	taskID := h.progress.Start(p.UserID, "Importing users", 0)

	result, err := h.importService.ImportUsersWithProgress(ctx, bytesReader(p.Content), func(current, total int) {
		h.progress.Update(p.UserID, taskID, current)
	})
	if err != nil {
		h.progress.Fail(p.UserID, taskID, err.Error())
		return err
	}

	h.progress.Complete(p.UserID, taskID, fmt.Sprintf("success:%d,failed:%d", result.Success, result.Failed))
	return nil
}

func (h *DataHandler) handleImportProjects(ctx context.Context, t *asynq.Task) error {
	var p queue.ImportPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return err
	}

	taskID := h.progress.Start(p.UserID, "Importing projects", 0)

	result, err := h.importService.ImportProjectsWithProgress(ctx, bytesReader(p.Content), p.UserID, func(current, total int) {
		h.progress.Update(p.UserID, taskID, current)
	})
	if err != nil {
		h.progress.Fail(p.UserID, taskID, err.Error())
		return err
	}

	h.progress.Complete(p.UserID, taskID, fmt.Sprintf("success:%d,failed:%d", result.Success, result.Failed))
	return nil
}

func (h *DataHandler) handleDemo(_ context.Context, t *asynq.Task) error {
	var p queue.DemoPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return err
	}
	if p.Duration <= 0 {
		p.Duration = 5 * time.Second
	}
	time.Sleep(p.Duration)
	return nil
}

// --- Sync exports (backward compatible) ---

func (h *DataHandler) ExportUsers(c *gin.Context) {
	data, err := h.exportService.ExportUsers(c.Request.Context())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}
	filename := fmt.Sprintf("users_%s.csv", time.Now().Format("20060102_150405"))
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Data(200, "text/csv; charset=utf-8", data)
}

func (h *DataHandler) ExportProjects(c *gin.Context) {
	data, err := h.exportService.ExportProjects(c.Request.Context())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}
	filename := fmt.Sprintf("projects_%s.csv", time.Now().Format("20060102_150405"))
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Data(200, "text/csv; charset=utf-8", data)
}

func (h *DataHandler) ExportRoles(c *gin.Context) {
	data, err := h.exportService.ExportRoles(c.Request.Context())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}
	filename := fmt.Sprintf("roles_%s.csv", time.Now().Format("20060102_150405"))
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Data(200, "text/csv; charset=utf-8", data)
}

// --- Async exports with progress ---

func (h *DataHandler) AsyncExportUsers(c *gin.Context) {
	userID, _ := c.Get("user_id")
	username, _ := c.Get("username")

	if _, err := h.taskQueue.TryEnqueue(queue.TypeExportUsers, queue.ExportPayload{
		UserID:   userID.(int),
		Username: username.(string),
	}); err != nil {
		response.AppError(c, apperr.ErrServiceUnavailable.WithMessage("failed to enqueue task"))
		return
	}
	response.Success(c, gin.H{"message": "export started"})
}

func (h *DataHandler) AsyncExportProjects(c *gin.Context) {
	userID, _ := c.Get("user_id")
	username, _ := c.Get("username")

	if _, err := h.taskQueue.TryEnqueue(queue.TypeExportProjects, queue.ExportPayload{
		UserID:   userID.(int),
		Username: username.(string),
	}); err != nil {
		response.AppError(c, apperr.ErrServiceUnavailable.WithMessage("failed to enqueue task"))
		return
	}
	response.Success(c, gin.H{"message": "export started"})
}

func (h *DataHandler) AsyncExportRoles(c *gin.Context) {
	userID, _ := c.Get("user_id")
	username, _ := c.Get("username")

	if _, err := h.taskQueue.TryEnqueue(queue.TypeExportRoles, queue.ExportPayload{
		UserID:   userID.(int),
		Username: username.(string),
	}); err != nil {
		response.AppError(c, apperr.ErrServiceUnavailable.WithMessage("failed to enqueue task"))
		return
	}
	response.Success(c, gin.H{"message": "export started"})
}

// --- Async imports with progress ---

func (h *DataHandler) AsyncImportUsers(c *gin.Context) {
	userID, _ := c.Get("user_id")

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("file is required"))
		return
	}
	content, err := io.ReadAll(file)
	file.Close()
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("failed to read file"))
		return
	}

	if _, err := h.taskQueue.TryEnqueue(queue.TypeImportUsers, queue.ImportPayload{
		UserID:  userID.(int),
		Content: content,
	}); err != nil {
		response.AppError(c, apperr.ErrServiceUnavailable.WithMessage("failed to enqueue task"))
		return
	}
	response.Success(c, gin.H{"message": "import started"})
}

func (h *DataHandler) AsyncImportProjects(c *gin.Context) {
	userID, _ := c.Get("user_id")

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("file is required"))
		return
	}
	content, err := io.ReadAll(file)
	file.Close()
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("failed to read file"))
		return
	}

	if _, err := h.taskQueue.TryEnqueue(queue.TypeImportProjects, queue.ImportPayload{
		UserID:  userID.(int),
		Content: content,
	}); err != nil {
		response.AppError(c, apperr.ErrServiceUnavailable.WithMessage("failed to enqueue task"))
		return
	}
	response.Success(c, gin.H{"message": "import started"})
}

// --- Sync imports (backward compatible) ---

func (h *DataHandler) ImportUsers(c *gin.Context) {
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("file is required"))
		return
	}
	defer file.Close()

	result, err := h.importService.ImportUsers(c.Request.Context(), file)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}
	response.Success(c, result)
}

func (h *DataHandler) ImportProjects(c *gin.Context) {
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("file is required"))
		return
	}
	defer file.Close()

	userID, _ := c.Get("user_id")
	ownerID, ok := userID.(int)
	if !ok {
		response.AppError(c, apperr.ErrUnauthorized.WithMessage("invalid user context"))
		return
	}

	result, err := h.importService.ImportProjects(c.Request.Context(), file, ownerID)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}
	response.Success(c, result)
}

type bytesReaderWrapper struct {
	*io.SectionReader
}

func bytesReader(data []byte) io.Reader {
	return io.NewSectionReader(readerAtBytes(data), 0, int64(len(data)))
}

type readerAtBytes []byte

func (r readerAtBytes) ReadAt(p []byte, off int64) (int, error) {
	if off >= int64(len(r)) {
		return 0, io.EOF
	}
	n := copy(p, r[off:])
	if n < len(p) {
		return n, io.EOF
	}
	return n, nil
}
