package middleware

import (
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CORS(allowedOrigins []string) gin.HandlerFunc {
	config := cors.Config{
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-API-Key"},
		ExposeHeaders:    []string{"Content-Length"},
		MaxAge:           86400 * time.Second,
		AllowCredentials: false,
	}

	var httpOrigins []string
	var customOrigins []string

	for _, origin := range allowedOrigins {
		origin = strings.TrimSpace(origin)
		if origin == "" {
			continue
		}
		if origin == "*" {
			config.AllowAllOrigins = true
			return cors.New(config)
		}
		if strings.HasPrefix(origin, "http://") || strings.HasPrefix(origin, "https://") {
			httpOrigins = append(httpOrigins, origin)
		} else {
			customOrigins = append(customOrigins, origin)
		}
	}

	if len(httpOrigins) == 0 && len(customOrigins) == 0 {
		config.AllowAllOrigins = true
		return cors.New(config)
	}

	if len(customOrigins) > 0 {
		allowed := make(map[string]bool, len(httpOrigins)+len(customOrigins))
		for _, o := range httpOrigins {
			allowed[o] = true
		}
		for _, o := range customOrigins {
			allowed[o] = true
		}
		config.AllowOriginFunc = func(origin string) bool {
			return allowed[origin]
		}
	} else {
		config.AllowOrigins = httpOrigins
	}

	return cors.New(config)
}
