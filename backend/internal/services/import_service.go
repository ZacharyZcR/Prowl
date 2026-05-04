package services

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"io"

	"golang.org/x/crypto/bcrypt"

	"github.com/ZacharyZcR/STC/backend/ent"
	entRole "github.com/ZacharyZcR/STC/backend/ent/role"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type ImportService struct {
	client *ent.Client
}

func NewImportService(client *ent.Client) *ImportService {
	return &ImportService{client: client}
}

type ImportResult struct {
	Total   int      `json:"total"`
	Success int      `json:"success"`
	Failed  int      `json:"failed"`
	Errors  []string `json:"errors,omitempty"`
}

func (s *ImportService) ImportUsers(ctx context.Context, reader io.Reader) (*ImportResult, error) {
	return s.ImportUsersWithProgress(ctx, reader, nil)
}

func (s *ImportService) ImportUsersWithProgress(ctx context.Context, reader io.Reader, onProgress ProgressFunc) (*ImportResult, error) {
	// Read all rows first to know total count
	raw, err := io.ReadAll(reader)
	if err != nil {
		return nil, apperr.ErrBadRequest.WithMessage("failed to read file")
	}

	r := csv.NewReader(bytes.NewReader(raw))
	header, err := r.Read()
	if err != nil {
		return nil, apperr.ErrBadRequest.WithMessage("failed to read CSV header")
	}
	colMap := make(map[string]int)
	for i, h := range header {
		colMap[h] = i
	}

	if _, ok := colMap["Username"]; !ok {
		return nil, apperr.ErrBadRequest.WithMessage("CSV must have a Username column")
	}

	// Count total rows
	var allRows [][]string
	for {
		record, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			allRows = append(allRows, nil) // placeholder for bad row
			continue
		}
		allRows = append(allRows, record)
	}

	total := len(allRows)

	viewerRole, err := s.client.Role.Query().Where(entRole.Name("viewer")).Only(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("default viewer role not found: " + err.Error())
	}

	defaultPwd, err := bcrypt.GenerateFromPassword([]byte("changeme"), bcrypt.DefaultCost)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to hash default password: " + err.Error())
	}

	result := &ImportResult{Total: total}

	for i, record := range allRows {
		if record == nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: invalid CSV row", i+1))
			if onProgress != nil {
				onProgress(i+1, total)
			}
			continue
		}

		username := getCol(record, colMap, "Username")
		if username == "" {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: empty username", i+1))
			if onProgress != nil {
				onProgress(i+1, total)
			}
			continue
		}

		builder := s.client.User.Create().
			SetUsername(username).
			SetPassword(string(defaultPwd)).
			SetRole(viewerRole)

		if email := getCol(record, colMap, "Email"); email != "" {
			builder = builder.SetEmail(email)
		}
		if nickname := getCol(record, colMap, "Nickname"); nickname != "" {
			builder = builder.SetNickname(nickname)
		}

		_, err = builder.Save(ctx)
		if err != nil {
			result.Failed++
			if ent.IsConstraintError(err) {
				result.Errors = append(result.Errors, fmt.Sprintf("row %d: username or email already exists (%s)", i+1, username))
			} else {
				result.Errors = append(result.Errors, fmt.Sprintf("row %d: %v", i+1, err))
			}
		} else {
			result.Success++
		}

		if onProgress != nil && (i%10 == 0 || i == total-1) {
			onProgress(i+1, total)
		}
	}

	return result, nil
}

func (s *ImportService) ImportProjects(ctx context.Context, reader io.Reader, ownerID int) (*ImportResult, error) {
	return s.ImportProjectsWithProgress(ctx, reader, ownerID, nil)
}

func (s *ImportService) ImportProjectsWithProgress(ctx context.Context, reader io.Reader, ownerID int, onProgress ProgressFunc) (*ImportResult, error) {
	raw, err := io.ReadAll(reader)
	if err != nil {
		return nil, apperr.ErrBadRequest.WithMessage("failed to read file")
	}

	r := csv.NewReader(bytes.NewReader(raw))
	header, err := r.Read()
	if err != nil {
		return nil, apperr.ErrBadRequest.WithMessage("failed to read CSV header")
	}
	colMap := make(map[string]int)
	for i, h := range header {
		colMap[h] = i
	}

	if _, ok := colMap["Name"]; !ok {
		return nil, apperr.ErrBadRequest.WithMessage("CSV must have a Name column")
	}

	var allRows [][]string
	for {
		record, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			allRows = append(allRows, nil)
			continue
		}
		allRows = append(allRows, record)
	}

	total := len(allRows)
	result := &ImportResult{Total: total}

	for i, record := range allRows {
		if record == nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: invalid CSV row", i+1))
			if onProgress != nil {
				onProgress(i+1, total)
			}
			continue
		}

		name := getCol(record, colMap, "Name")
		if name == "" {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: empty project name", i+1))
			if onProgress != nil {
				onProgress(i+1, total)
			}
			continue
		}

		builder := s.client.Project.Create().
			SetName(name).
			SetOwnerID(ownerID)

		if desc := getCol(record, colMap, "Description"); desc != "" {
			builder = builder.SetDescription(desc)
		}
		if status := getCol(record, colMap, "Status"); status != "" {
			builder = builder.SetStatus(status)
		}

		_, err = builder.Save(ctx)
		if err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: %v", i+1, err))
		} else {
			result.Success++
		}

		if onProgress != nil && (i%10 == 0 || i == total-1) {
			onProgress(i+1, total)
		}
	}

	return result, nil
}

func getCol(record []string, colMap map[string]int, key string) string {
	idx, ok := colMap[key]
	if !ok || idx >= len(record) {
		return ""
	}
	return record[idx]
}
