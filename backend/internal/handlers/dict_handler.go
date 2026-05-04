package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type DictHandler struct {
	dictService *services.DictService
}

func NewDictHandler(dictService *services.DictService) *DictHandler {
	return &DictHandler{dictService: dictService}
}

func (h *DictHandler) ListAll(c *gin.Context) {
	items, err := h.dictService.ListAll(c.Request.Context())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}
	result := make([]models.DictResponse, 0, len(items))
	for _, item := range items {
		result = append(result, toDictResponse(item))
	}
	response.Success(c, result)
}

func (h *DictHandler) Toggle(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid dict id"))
		return
	}
	if appErr := h.dictService.Toggle(c.Request.Context(), id); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, nil)
}

func (h *DictHandler) ListGroups(c *gin.Context) {
	groups, err := h.dictService.ListGroups(c.Request.Context())
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, groups)
}

func (h *DictHandler) ListByGroup(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("group name is required"))
		return
	}

	items, err := h.dictService.ListByGroup(c.Request.Context(), group)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	result := make([]models.DictResponse, 0, len(items))
	for _, item := range items {
		result = append(result, toDictResponse(item))
	}

	response.Success(c, result)
}

func (h *DictHandler) Create(c *gin.Context) {
	var req models.CreateDictRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	d, err := h.dictService.Create(c.Request.Context(), &req)
	if err != nil {
		response.AppError(c, err.(*apperr.AppError))
		return
	}

	response.Success(c, toDictResponse(d))
}

func (h *DictHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid dict id"))
		return
	}

	var req models.UpdateDictRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	d, appErr := h.dictService.Update(c.Request.Context(), id, &req)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, toDictResponse(d))
}

func (h *DictHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid dict id"))
		return
	}

	if appErr := h.dictService.Delete(c.Request.Context(), id); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	response.Success(c, nil)
}

func toDictResponse(d *ent.Dict) models.DictResponse {
	return models.DictResponse{
		ID:        d.ID,
		GroupName: d.GroupName,
		Key:       d.Key,
		Label:     d.Label,
		Value:     d.Value,
		SortOrder: d.SortOrder,
		Enabled:   d.Enabled,
		CreatedAt: d.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
}
