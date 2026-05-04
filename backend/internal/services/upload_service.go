package services

import (
	"context"
	"errors"
	"fmt"
	"io"
	"math"
	"mime/multipart"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/ZacharyZcR/STC/backend/ent"
	entFile "github.com/ZacharyZcR/STC/backend/ent/file"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type UploadService struct {
	uploadDir string
	client    *ent.Client
}

func NewUploadService(uploadDir string, client *ent.Client) *UploadService {
	return &UploadService{uploadDir: uploadDir, client: client}
}

func (s *UploadService) SaveFile(ctx context.Context, file *multipart.FileHeader, uploaderID int, uploaderName string) (*ent.File, error) {
	now := time.Now()
	subDir := fmt.Sprintf("%d/%02d/%02d", now.Year(), now.Month(), now.Day())
	fullDir := filepath.Join(s.uploadDir, filepath.FromSlash(subDir))

	if err := os.MkdirAll(fullDir, 0o755); err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to create upload directory: " + err.Error())
	}

	ext := filepath.Ext(file.Filename)
	filename := uuid.New().String() + ext
	relativePath := path.Join(subDir, filename)
	fullPath := filepath.Join(s.uploadDir, filepath.FromSlash(relativePath))
	saved := false

	src, err := file.Open()
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to open uploaded file: " + err.Error())
	}
	defer src.Close()

	dst, err := os.Create(fullPath)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to save uploaded file: " + err.Error())
	}
	defer dst.Close()
	defer func() {
		if !saved {
			_ = os.Remove(fullPath)
		}
	}()

	buf := make([]byte, 32*1024)
	for {
		n, readErr := src.Read(buf)
		if n > 0 {
			if _, writeErr := dst.Write(buf[:n]); writeErr != nil {
				return nil, apperr.ErrInternal.WithMessage("failed to write uploaded file: " + err.Error())
			}
		}
		if errors.Is(readErr, io.EOF) {
			break
		}
		if readErr != nil {
			return nil, apperr.ErrInternal.WithMessage("failed to read uploaded file: " + err.Error())
		}
	}

	mimeType := detectMimeType(file)

	record, err := s.client.File.Create().
		SetName(file.Filename).
		SetPath(relativePath).
		SetSize(file.Size).
		SetMimeType(mimeType).
		SetUploaderID(uploaderID).
		SetUploaderName(uploaderName).
		Save(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to create file record: " + err.Error())
	}
	saved = true

	return record, nil
}

func (s *UploadService) List(ctx context.Context, q *models.FileListQuery, uploaderID int, includeAll bool) (*models.PaginatedResponse, error) {
	query := s.client.File.Query()
	if !includeAll {
		query = query.Where(entFile.UploaderID(uploaderID))
	}

	total, err := query.Count(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to count files: " + err.Error())
	}

	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 || q.PageSize > 100 {
		q.PageSize = 20
	}

	offset := (q.Page - 1) * q.PageSize
	files, err := query.
		Limit(q.PageSize).
		Offset(offset).
		Order(ent.Desc(entFile.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to list files: " + err.Error())
	}

	items := make([]models.FileResponse, 0, len(files))
	for _, f := range files {
		items = append(items, buildFileResponse(f))
	}

	return &models.PaginatedResponse{
		Items:      items,
		Total:      total,
		Page:       q.Page,
		PageSize:   q.PageSize,
		TotalPages: int(math.Ceil(float64(total) / float64(q.PageSize))),
	}, nil
}

func (s *UploadService) Delete(ctx context.Context, id int) error {
	f, err := s.client.File.Get(ctx, id)
	if err != nil {
		return apperr.ErrNotFound.WithMessage("file not found")
	}

	fullPath := filepath.Join(s.uploadDir, f.Path)
	_ = os.Remove(fullPath)

	if err := s.client.File.DeleteOneID(id).Exec(ctx); err != nil {
		return apperr.ErrInternal.WithMessage("failed to delete file record: " + err.Error())
	}
	return nil
}

func (s *UploadService) GetByID(ctx context.Context, id int) (*ent.File, error) {
	f, err := s.client.File.Get(ctx, id)
	if err != nil {
		return nil, apperr.ErrNotFound.WithMessage("file not found")
	}
	return f, nil
}

func (s *UploadService) GetByPath(ctx context.Context, relativePath string) (*ent.File, error) {
	f, err := s.client.File.Query().Where(entFile.Path(relativePath)).Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.ErrNotFound.WithMessage("file not found")
		}
		return nil, apperr.ErrInternal.WithMessage("failed to get file: " + err.Error())
	}
	return f, nil
}

func (s *UploadService) FilePath(relativePath string) string {
	return filepath.Join(s.uploadDir, relativePath)
}

func (s *UploadService) ResolvePath(relativePath string) (string, error) {
	cleanRelative := strings.TrimPrefix(filepath.Clean("/"+relativePath), "/")
	basePath, err := filepath.Abs(s.uploadDir)
	if err != nil {
		return "", apperr.ErrInternal.WithMessage("failed to resolve upload directory: " + err.Error())
	}

	fullPath, err := filepath.Abs(filepath.Join(basePath, cleanRelative))
	if err != nil {
		return "", apperr.ErrInternal.WithMessage("failed to resolve file path: " + err.Error())
	}
	if fullPath != basePath && !strings.HasPrefix(fullPath, basePath+string(filepath.Separator)) {
		return "", apperr.ErrForbidden.WithMessage("invalid file path")
	}

	return fullPath, nil
}

func (s *UploadService) SaveGeneratedFile(ctx context.Context, filename string, content []byte, mimeType string, uploaderID int, uploaderName string) (*ent.File, error) {
	now := time.Now()
	subDir := path.Join("generated", fmt.Sprintf("%d", uploaderID), now.Format("2006/01/02"))
	fullDir := filepath.Join(s.uploadDir, filepath.FromSlash(subDir))
	if err := os.MkdirAll(fullDir, 0o755); err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to create export directory: " + err.Error())
	}

	ext := filepath.Ext(filename)
	stem := strings.TrimSuffix(filename, ext)
	if stem == "" {
		stem = "export"
	}
	safeStem := sanitizeFilename(stem)
	if safeStem == "" {
		safeStem = "export"
	}

	storedName := safeStem + "_" + uuid.NewString() + ext
	relativePath := path.Join(subDir, storedName)
	fullPath := filepath.Join(s.uploadDir, filepath.FromSlash(relativePath))
	saved := false

	if err := os.WriteFile(fullPath, content, 0o644); err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to save generated file: " + err.Error())
	}
	defer func() {
		if !saved {
			_ = os.Remove(fullPath)
		}
	}()

	record, err := s.client.File.Create().
		SetName(filename).
		SetPath(relativePath).
		SetSize(int64(len(content))).
		SetMimeType(mimeType).
		SetUploaderID(uploaderID).
		SetUploaderName(uploaderName).
		Save(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to create file record: " + err.Error())
	}

	saved = true
	return record, nil
}

func sanitizeFilename(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return ""
	}

	var b strings.Builder
	for _, r := range name {
		switch {
		case r >= 'a' && r <= 'z':
			b.WriteRune(r)
		case r >= 'A' && r <= 'Z':
			b.WriteRune(r)
		case r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == '-' || r == '_':
			b.WriteRune(r)
		default:
			b.WriteRune('_')
		}
	}

	return strings.Trim(b.String(), "_")
}

func buildFileResponse(f *ent.File) models.FileResponse {
	return models.FileResponse{
		ID:           f.ID,
		Name:         f.Name,
		Path:         f.Path,
		Size:         f.Size,
		MimeType:     f.MimeType,
		UploaderID:   f.UploaderID,
		UploaderName: f.UploaderName,
		URL:          "/uploads/" + f.Path,
		CreatedAt:    f.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
}

func detectMimeType(fh *multipart.FileHeader) string {
	f, err := fh.Open()
	if err != nil {
		return "application/octet-stream"
	}
	defer f.Close()

	buf := make([]byte, 512)
	n, err := f.Read(buf)
	if err != nil || n == 0 {
		return "application/octet-stream"
	}
	return http.DetectContentType(buf[:n])
}
