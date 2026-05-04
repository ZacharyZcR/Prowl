package main

import (
	"context"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	_ "github.com/ZacharyZcR/STC/backend/docs" // swagger docs

	"github.com/ZacharyZcR/STC/backend/internal/database"
	stcgrpc "github.com/ZacharyZcR/STC/backend/internal/grpc"
	"github.com/ZacharyZcR/STC/backend/internal/handlers"
	"github.com/ZacharyZcR/STC/backend/internal/middleware"
	"github.com/ZacharyZcR/STC/backend/internal/queue"
	"github.com/ZacharyZcR/STC/backend/internal/server"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	"github.com/ZacharyZcR/STC/backend/pkg/config"
	"github.com/ZacharyZcR/STC/backend/pkg/logger"
	"google.golang.org/grpc/health/grpc_health_v1"
)

// @title Prowl Range API
// @version 0.1.0
// @description Prowl Range Backend API
// @BasePath /api/v1
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization

var (
	version   = "dev"
	buildTime = "unknown"
	gitCommit = "unknown"
)

func main() {
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatalf("invalid config: %v", err)
	}
	gin.SetMode(cfg.GinMode)

	zl := logger.Init()
	defer zl.Sync()

	client, err := database.InitDB(context.Background(), cfg.DatabaseURL, cfg.DBMigrationMode)
	if err != nil {
		log.Fatalf("failed to init database: %v", err)
	}
	defer client.Close()

	rdb := database.InitRedis(cfg.RedisURL, cfg.RedisPassword)
	defer rdb.Close()

	outboundHTTPClient := &http.Client{Timeout: cfg.OutboundHTTPTimeout}

	if err := database.SeedAdmin(context.Background(), client); err != nil {
		log.Printf("seed admin failed: %v (continuing)", err)
	}

	authService := services.NewAuthService(client, cfg.JWTSecret, rdb)

	casbinService, err := services.NewCasbinService(context.Background(), client)
	if err != nil {
		log.Fatalf("failed to init casbin: %v", err)
	}
	middleware.SetCasbinService(casbinService)

	hub := server.NewHub()
	go hub.Run()
	sseBroker := server.NewSSEBroker()

	handlers.Version = version
	handlers.BuildTime = buildTime
	handlers.GitCommit = gitCommit

	taskQueue := queue.New(queue.Config{
		RedisAddr:     cfg.RedisURL,
		RedisPassword: cfg.RedisPassword,
		Workers:       3,
	})

	cronService := services.NewCronService(client)
	cronService.RegisterHandler("cleanup_old_logs", func(ctx context.Context) error { return nil })
	cronService.RegisterHandler("cleanup_error_logs", func(ctx context.Context) error { return nil })

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	r := handlers.SetupRouter(client, rdb, authService, zl, hub, sseBroker, cfg, taskQueue, cronService, outboundHTTPClient)

	cronService.EnsureBuiltin(ctx, "自动结束到期比赛", "*/30 * * * *", "auto_end_competitions")
	go cronService.Start(ctx)
	defer cronService.Stop()

	// Start Asynq worker server (handlers registered during SetupRouter)
	if err := taskQueue.Start(); err != nil {
		log.Fatalf("failed to start task queue: %v", err)
	}
	defer taskQueue.Stop()

	srv := &http.Server{Addr: cfg.ListenAddr, Handler: r}

	// gRPC server
	grpcSrv := stcgrpc.NewServer(cfg.GRPCAddr)
	grpc_health_v1.RegisterHealthServer(grpcSrv.GRPCServer(), &stcgrpc.HealthService{})
	go func() {
		if err := grpcSrv.Start(); err != nil {
			log.Printf("gRPC server failed: %v", err)
		}
	}()

	go func() {
		log.Printf("server starting on %s (version=%s)", cfg.ListenAddr, version)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen failed: %v", err)
		}
	}()

	<-ctx.Done()

	log.Println("shutting down server...")
	grpcSrv.Stop()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("server shutdown error: %v", err)
	}
	log.Println("server stopped")
}
