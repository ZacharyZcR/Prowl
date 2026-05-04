package services

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/pkg/metrics"
)

var startedAt = time.Now()

type HealthService struct {
	client *ent.Client
	rdb    *redis.Client
}

func NewHealthService(client *ent.Client, rdb *redis.Client) *HealthService {
	return &HealthService{client: client, rdb: rdb}
}

type SystemHealth struct {
	Server   ServerInfo      `json:"server"`
	Database ComponentHealth `json:"database"`
	Redis    ComponentHealth `json:"redis"`
	Runtime  RuntimeInfo     `json:"runtime"`
	Disk     DiskInfo        `json:"disk"`
}

type ServerInfo struct {
	Version   string `json:"version"`
	Uptime    string `json:"uptime"`
	StartedAt string `json:"started_at"`
	GoVersion string `json:"go_version"`
	OS        string `json:"os"`
	Arch      string `json:"arch"`
}

type ComponentHealth struct {
	Status  string `json:"status"`
	Latency string `json:"latency"`
	Message string `json:"message,omitempty"`
}

type RuntimeInfo struct {
	Goroutines int    `json:"goroutines"`
	MemAlloc   string `json:"mem_alloc"`
	MemSys     string `json:"mem_sys"`
	GCPauseAvg string `json:"gc_pause_avg"`
	NumGC      int    `json:"num_gc"`
	CPUs       int    `json:"cpus"`
}

type DiskInfo struct {
	UploadDir  string `json:"upload_dir"`
	UploadSize string `json:"upload_size"`
}

type MetricsSummary struct {
	TotalRequests int64       `json:"total_requests"`
	TotalErrors   int64       `json:"total_errors"`
	ErrorRate     float64     `json:"error_rate"`
	TopPaths      []PathCount `json:"top_paths"`
	Uptime        string      `json:"uptime"`
}

type PathCount struct {
	Path  string `json:"path"`
	Count int64  `json:"count"`
}

func (s *HealthService) Check(ctx context.Context, version string) (*SystemHealth, error) {
	h := &SystemHealth{}

	// Server info
	uptime := time.Since(startedAt)
	h.Server = ServerInfo{
		Version:   version,
		Uptime:    formatDuration(uptime),
		StartedAt: startedAt.Format(time.RFC3339),
		GoVersion: runtime.Version(),
		OS:        runtime.GOOS,
		Arch:      runtime.GOARCH,
	}

	// Database check
	h.Database = s.checkDB(ctx)

	// Redis check
	h.Redis = s.checkRedis(ctx)

	// Runtime
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)

	var gcPauseAvg float64
	if mem.NumGC > 0 {
		var total uint64
		n := mem.NumGC
		if n > 256 {
			n = 256
		}
		for i := uint32(0); i < n; i++ {
			total += mem.PauseNs[i]
		}
		gcPauseAvg = float64(total) / float64(n) / 1e6 // ms
	}

	h.Runtime = RuntimeInfo{
		Goroutines: runtime.NumGoroutine(),
		MemAlloc:   formatBytes(mem.Alloc),
		MemSys:     formatBytes(mem.Sys),
		GCPauseAvg: fmt.Sprintf("%.2f ms", gcPauseAvg),
		NumGC:      int(mem.NumGC),
		CPUs:       runtime.NumCPU(),
	}

	// Disk
	uploadDir := "./uploads"
	size := dirSize(uploadDir)
	h.Disk = DiskInfo{
		UploadDir:  uploadDir,
		UploadSize: formatBytes(uint64(size)),
	}

	return h, nil
}

func (s *HealthService) GetMetricsSummary() (*MetricsSummary, error) {
	totalReqs, totalErrs, paths, uptime := metrics.GetSummary()

	var errorRate float64
	if totalReqs > 0 {
		errorRate = float64(totalErrs) / float64(totalReqs) * 100
	}

	topPaths := make([]PathCount, 0, len(paths))
	for p, c := range paths {
		topPaths = append(topPaths, PathCount{Path: p, Count: c})
	}
	sort.Slice(topPaths, func(i, j int) bool {
		return topPaths[i].Count > topPaths[j].Count
	})
	if len(topPaths) > 20 {
		topPaths = topPaths[:20]
	}

	return &MetricsSummary{
		TotalRequests: totalReqs,
		TotalErrors:   totalErrs,
		ErrorRate:     errorRate,
		TopPaths:      topPaths,
		Uptime:        formatDuration(uptime),
	}, nil
}

func (s *HealthService) checkDB(ctx context.Context) ComponentHealth {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	start := time.Now()
	_, err := s.client.User.Query().Limit(1).Count(ctx)
	latency := time.Since(start)

	if err != nil {
		return ComponentHealth{
			Status:  "unhealthy",
			Latency: latency.String(),
			Message: err.Error(),
		}
	}
	return ComponentHealth{
		Status:  "healthy",
		Latency: latency.String(),
	}
}

func (s *HealthService) checkRedis(ctx context.Context) ComponentHealth {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	start := time.Now()
	err := s.rdb.Ping(ctx).Err()
	latency := time.Since(start)

	if err != nil {
		return ComponentHealth{
			Status:  "unhealthy",
			Latency: latency.String(),
			Message: err.Error(),
		}
	}
	return ComponentHealth{
		Status:  "healthy",
		Latency: latency.String(),
	}
}

func formatBytes(b uint64) string {
	const (
		KB = 1024
		MB = KB * 1024
		GB = MB * 1024
	)
	switch {
	case b >= GB:
		return fmt.Sprintf("%.1f GB", float64(b)/float64(GB))
	case b >= MB:
		return fmt.Sprintf("%.1f MB", float64(b)/float64(MB))
	case b >= KB:
		return fmt.Sprintf("%.1f KB", float64(b)/float64(KB))
	default:
		return fmt.Sprintf("%d B", b)
	}
}

func formatDuration(d time.Duration) string {
	days := int(d.Hours()) / 24
	hours := int(d.Hours()) % 24
	mins := int(d.Minutes()) % 60
	if days > 0 {
		return fmt.Sprintf("%dd %dh %dm", days, hours, mins)
	}
	if hours > 0 {
		return fmt.Sprintf("%dh %dm", hours, mins)
	}
	return fmt.Sprintf("%dm", mins)
}

func dirSize(path string) int64 {
	var size int64
	_ = filepath.Walk(path, func(_ string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if !info.IsDir() {
			size += info.Size()
		}
		return nil
	})
	return size
}
