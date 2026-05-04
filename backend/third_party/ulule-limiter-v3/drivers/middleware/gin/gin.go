package gin

import (
	ginpkg "github.com/gin-gonic/gin"
	limiter "github.com/ulule/limiter/v3"
)

func NewMiddleware(_ *limiter.Limiter) ginpkg.HandlerFunc {
	return func(c *ginpkg.Context) {
		c.Next()
	}
}
