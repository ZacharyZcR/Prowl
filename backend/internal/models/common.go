package models

type BatchDeleteRequest struct {
	IDs []int `json:"ids" binding:"required,min=1"`
}
