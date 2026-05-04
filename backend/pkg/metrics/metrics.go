package metrics

import (
	"fmt"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// Metrics 简单的 Prometheus text format 指标，不引入 prometheus client 依赖
type Metrics struct {
	mu             sync.RWMutex
	totalRequests  int64
	totalErrors    int64
	requestsByPath map[string]int64
	uptimeStart    time.Time
}

var global = &Metrics{
	requestsByPath: make(map[string]int64),
	uptimeStart:    time.Now(),
}

// Middleware 记录每个请求的指标
func Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		global.mu.Lock()
		global.totalRequests++
		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}
		global.requestsByPath[path]++
		if c.Writer.Status() >= 400 {
			global.totalErrors++
		}
		global.mu.Unlock()
	}
}

// GetSummary returns a snapshot of current metrics (thread-safe).
func GetSummary() (totalRequests, totalErrors int64, pathCounts map[string]int64, uptime time.Duration) {
	global.mu.RLock()
	defer global.mu.RUnlock()

	pathCounts = make(map[string]int64, len(global.requestsByPath))
	for k, v := range global.requestsByPath {
		pathCounts[k] = v
	}
	return global.totalRequests, global.totalErrors, pathCounts, time.Since(global.uptimeStart)
}

// Handler GET /metrics — Prometheus text format
func Handler() gin.HandlerFunc {
	return func(c *gin.Context) {
		global.mu.RLock()
		defer global.mu.RUnlock()

		c.Header("Content-Type", "text/plain; version=0.0.4")

		uptime := time.Since(global.uptimeStart).Seconds()

		fmt.Fprintf(c.Writer, "# HELP stc_requests_total Total HTTP requests\n")
		fmt.Fprintf(c.Writer, "# TYPE stc_requests_total counter\n")
		fmt.Fprintf(c.Writer, "stc_requests_total %d\n\n", global.totalRequests)

		fmt.Fprintf(c.Writer, "# HELP stc_errors_total Total HTTP errors (4xx+5xx)\n")
		fmt.Fprintf(c.Writer, "# TYPE stc_errors_total counter\n")
		fmt.Fprintf(c.Writer, "stc_errors_total %d\n\n", global.totalErrors)

		fmt.Fprintf(c.Writer, "# HELP stc_uptime_seconds Server uptime\n")
		fmt.Fprintf(c.Writer, "# TYPE stc_uptime_seconds gauge\n")
		fmt.Fprintf(c.Writer, "stc_uptime_seconds %.0f\n\n", uptime)

		fmt.Fprintf(c.Writer, "# HELP stc_requests_by_path Requests by path\n")
		fmt.Fprintf(c.Writer, "# TYPE stc_requests_by_path counter\n")
		for path, count := range global.requestsByPath {
			fmt.Fprintf(c.Writer, "stc_requests_by_path{path=%q} %d\n", path, count)
		}
	}
}
