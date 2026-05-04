package errors

import "fmt"

type AppError struct {
	Code       int    `json:"code"`
	Message    string `json:"message"`
	HTTPStatus int    `json:"-"`
}

var (
	ErrUnauthorized       = &AppError{Code: 40100, Message: "unauthorized", HTTPStatus: 401}
	ErrForbidden          = &AppError{Code: 40300, Message: "forbidden", HTTPStatus: 403}
	ErrNotFound           = &AppError{Code: 40400, Message: "not found", HTTPStatus: 404}
	ErrBadRequest         = &AppError{Code: 40000, Message: "bad request", HTTPStatus: 400}
	ErrServiceUnavailable = &AppError{Code: 50300, Message: "service unavailable", HTTPStatus: 503}
	ErrInternal           = &AppError{Code: 50000, Message: "internal error", HTTPStatus: 500}
	ErrInvalidCredentials = &AppError{Code: 40101, Message: "invalid credentials", HTTPStatus: 401}
)

func (e *AppError) Error() string { return e.Message }

func (e *AppError) WithMessage(msg string) *AppError {
	return &AppError{Code: e.Code, Message: msg, HTTPStatus: e.HTTPStatus}
}

func New(code int, httpStatus int, message string) *AppError {
	return &AppError{Code: code, HTTPStatus: httpStatus, Message: message}
}

func Wrap(err *AppError, detail error) *AppError {
	return &AppError{
		Code:       err.Code,
		HTTPStatus: err.HTTPStatus,
		Message:    fmt.Sprintf("%s: %v", err.Message, detail),
	}
}
