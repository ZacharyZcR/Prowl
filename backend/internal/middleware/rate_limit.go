package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	limiter "github.com/ulule/limiter/v3"
	mgin "github.com/ulule/limiter/v3/drivers/middleware/gin"
	"github.com/ulule/limiter/v3/drivers/store/memory"
)

func RateLimit(rate, burst int) gin.HandlerFunc {
	_ = burst

	r := limiter.Rate{
		Period: time.Second,
		Limit:  int64(rate),
	}
	store := memory.NewStore()
	instance := limiter.New(store, r)

	return mgin.NewMiddleware(instance)
}
