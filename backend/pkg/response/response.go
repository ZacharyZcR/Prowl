package response

import (
	"net/http"

	"github.com/gin-gonic/gin"

	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "ok",
		Data:    data,
	})
}

func Error(c *gin.Context, code int, msg string) {
	c.JSON(code, Response{
		Code:    code,
		Message: msg,
	})
}

func AppError(c *gin.Context, err *apperr.AppError) {
	_ = c.Error(err)
	c.JSON(err.HTTPStatus, Response{
		Code:    err.Code,
		Message: err.Message,
	})
}
