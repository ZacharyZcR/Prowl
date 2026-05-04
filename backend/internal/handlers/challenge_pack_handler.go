package handlers

import (
	"fmt"
	"io"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type ChallengePackHandler struct {
	service *services.ChallengePackService
}

func NewChallengePackHandler(service *services.ChallengePackService) *ChallengePackHandler {
	return &ChallengePackHandler{service: service}
}

func (h *ChallengePackHandler) Export(c *gin.Context) {
	idsStr := c.Query("ids")
	if idsStr == "" {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("ids parameter required"))
		return
	}

	parts := strings.Split(idsStr, ",")
	ids := make([]int, 0, len(parts))
	for _, p := range parts {
		id, err := strconv.Atoi(strings.TrimSpace(p))
		if err != nil {
			continue
		}
		ids = append(ids, id)
	}
	if len(ids) == 0 {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("no valid ids"))
		return
	}

	data, err := h.service.ExportPack(c.Request.Context(), ids)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=challenges_%d.zip", len(ids)))
	c.Data(200, "application/zip", data)
}

func (h *ChallengePackHandler) Import(c *gin.Context) {
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("file required"))
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("failed to read file"))
		return
	}

	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	imported, appErr := h.service.ImportPack(c.Request.Context(), data, uid)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, gin.H{"imported": imported})
}
