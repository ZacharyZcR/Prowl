package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/ZacharyZcR/STC/backend/ent"
	entCompetition "github.com/ZacharyZcR/STC/backend/ent/competition"
	"github.com/ZacharyZcR/STC/backend/internal/middleware"
	"github.com/ZacharyZcR/STC/backend/internal/queue"
	"github.com/ZacharyZcR/STC/backend/internal/server"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	"github.com/ZacharyZcR/STC/backend/pkg/config"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/metrics"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

func SetupRouter(client *ent.Client, rdb *redis.Client, authService *services.AuthService, zl *zap.Logger, hub *server.Hub, sseBroker *server.SSEBroker, cfg *config.Config, taskQueue *queue.Queue, cronService *services.CronService, outboundHTTPClient *http.Client) *gin.Engine {
	errorLogService := services.NewErrorLogService(client)
	errorLogHandler := NewErrorLogHandler(errorLogService)

	r := gin.New()
	r.Use(middleware.RequestID())
	r.Use(middleware.CORS(cfg.CORSAllowedOrigins))
	r.Use(middleware.Logger(zl))
	r.Use(gin.Recovery())
	r.Use(middleware.ErrorCapture(errorLogService))
	r.Use(metrics.Middleware())

	r.GET("/metrics", metrics.Handler())

	userService := services.NewUserService(client)
	roleService := services.NewRoleService(client)
	apiKeyService := services.NewAPIKeyService(client)
	preferenceService := services.NewPreferenceService(client)

	// 通知分发器（邮件 + Webhook 渠道在后面注册 settingService/webhookService 后补充）
	dispatcher := services.NewNotificationDispatcher()
	notifService := services.NewNotificationService(client, hub, sseBroker, dispatcher)

	loginLogService := services.NewLoginLogService(client)
	loginLogHandler := NewLoginLogHandler(loginLogService)

	authHandler := NewAuthHandler(authService, loginLogService)
	healthHandler := NewHealthHandler(client, rdb)
	userHandler := NewUserHandler(userService, authService)
	roleHandler := NewRoleHandler(roleService, authService)
	wsHandler := NewWSHandler(hub, authService, cfg.CORSAllowedOrigins)
	sseHandler := NewSSEHandler(sseBroker, authService)
	systemLogHandler := NewSystemLogHandler(authService)
	activityService := services.NewActivityService(client)
	projectService := services.NewProjectService(client, activityService)
	uploadService := services.NewUploadService(cfg.UploadDir, client)

	permissionService := services.NewPermissionService(client)
	permissionHandler := NewPermissionHandler(permissionService)

	notifHandler := NewNotificationHandler(notifService)
	projectHandler := NewProjectHandler(projectService)
	activityHandler := NewActivityHandler(activityService)
	uploadHandler := NewUploadHandler(uploadService, authService)

	v1 := r.Group("/api/v1")
	registerPublicRoutes(v1, cfg, client, authService, authHandler, healthHandler, wsHandler, sseHandler, systemLogHandler, outboundHTTPClient)

	portalAuthHandler := NewPortalAuthHandler(userService, authService, client)
	registerPortalAuthRoutes(v1, portalAuthHandler)

	authed := v1.Group("")
	authed.Use(middleware.APIKeyAuth(apiKeyService, client))
	authed.Use(middleware.JWTAuth(authService, client))
	authed.Use(middleware.AuditLog(activityService))

	registerUserRoutes(authed, userHandler)
	registerPermissionRoutes(authed, permissionHandler)
	registerRoleRoutes(authed, roleHandler)
	registerProjectRoutes(authed, projectHandler)
	registerActivityRoutes(authed, activityHandler, loginLogHandler)
	registerFileRoutes(authed, uploadHandler)
	registerNotificationRoutes(authed, notifHandler)
	registerErrorRoutes(v1, authed, errorLogHandler, systemLogHandler)
	registerManagementRoutes(v1, authed, client, rdb, outboundHTTPClient, sseBroker, taskQueue, cronService, apiKeyService, authService, preferenceService, uploadService, dispatcher)

	packService := services.NewChallengePackService(client)
	packHandler := NewChallengePackHandler(packService)
	registerChallengePackRoutes(authed, packHandler)

	competitionService := services.NewCompetitionService(client, activityService)
	teamService := services.NewTeamService(client, activityService)
	competitionHandler := NewCompetitionHandler(competitionService, teamService)
	teamHandler := NewTeamHandler(teamService)

	challengeService := services.NewChallengeService(client, activityService)
	challengeHandler := NewChallengeHandler(challengeService, teamService)
	registerChallengeRoutes(authed, challengeHandler)

	scoreboardService := services.NewScoreboardService(client, rdb)
	scoreboardHandler := NewScoreboardHandler(scoreboardService)

	flagSecretKey := cfg.FlagSecretKey
	if flagSecretKey == "" {
		flagSecretKey = cfg.JWTSecret
	}
	sseBroadcaster := &services.SSEBroadcaster{
		BroadcastFn: func(eventType string, data interface{}) {
			sseBroker.Broadcast(server.SSEEvent{Event: eventType, Data: data})
		},
	}
	flagService := services.NewFlagService(client, flagSecretKey, scoreboardService, sseBroadcaster)
	flagHandler := NewFlagHandler(flagService, teamService)

	writeupService := services.NewWriteupService(client)
	writeupHandler := NewWriteupHandler(writeupService, teamService)

	containerService, containerErr := services.NewContainerService(cfg.DockerHost, cfg.ChallengeBaseURL, cfg.ContainerNetworkPrefix, zl)
	var instanceHandler *InstanceHandler
	if containerErr != nil {
		zl.Warn("docker not available, container features disabled", zap.Error(containerErr))
	} else {
		instanceService := services.NewInstanceService(client, containerService, flagSecretKey, cfg.MaxContainersPerTeam, cfg.MaxContainersTotal, zl)
		instanceHandler = NewInstanceHandler(instanceService, teamService)
		dockerHandler := NewDockerHandler(containerService, instanceService)
		registerDockerRoutes(authed, dockerHandler)
		cronService.RegisterHandler("cleanup_expired_containers", func(ctx context.Context) error {
			_, err := instanceService.CleanupExpired(ctx)
			return err
		})
	}

	checkerService := services.NewCheckerService(client, zl)
	roundService := services.NewScoringRoundService(client, checkerService, zl)
	var awdService *services.AWDService
	if containerService != nil {
		awdService = services.NewAWDService(client, containerService, flagSecretKey, zl)
		roundService.SetAWDService(awdService)
	}
	awdHandler := NewAWDHandler(roundService, checkerService, awdService, teamService)

	cronService.RegisterHandler("awd_round_tick", func(ctx context.Context) error {
		comps, err := client.Competition.Query().
			Where(
				entCompetition.ModeEQ(entCompetition.ModeAwd),
				entCompetition.StatusEQ(entCompetition.StatusRunning),
			).All(ctx)
		if err != nil {
			return err
		}
		for _, c := range comps {
			_ = roundService.ExecuteRound(ctx, c.ID)
		}
		return nil
	})

	cronService.RegisterHandler("auto_end_competitions", func(ctx context.Context) error {
		now := time.Now()
		comps, err := client.Competition.Query().
			Where(
				entCompetition.StatusIn(entCompetition.StatusRunning, entCompetition.StatusRegistration),
				entCompetition.EndTimeNotNil(),
				entCompetition.EndTimeLT(now),
			).All(ctx)
		if err != nil {
			return err
		}
		for _, c := range comps {
			_ = client.Competition.UpdateOneID(c.ID).SetStatus(entCompetition.StatusEnded).Exec(ctx)
			zl.Info("competition auto-ended", zap.Int("id", c.ID), zap.String("title", c.Title))
		}
		return nil
	})

	scenarioService := services.NewScenarioService(client, activityService)
	scenarioHandler := NewScenarioHandler(scenarioService)

	registerCompetitionRoutes(authed, competitionHandler, flagHandler, scoreboardHandler)
	registerAWDRoutes(authed, awdHandler)
	registerScenarioRoutes(authed, scenarioHandler)

	exportCompHandler := NewExportCompetitionHandler(scoreboardService, flagService)
	registerExportCompetitionRoutes(authed, exportCompHandler)

	antiCheatService := services.NewAntiCheatService(client)
	antiCheatHandler := NewAntiCheatHandler(antiCheatService)
	registerAntiCheatRoutes(authed, antiCheatHandler)

	analyticsService := services.NewAnalyticsService(client)
	analyticsHandler := NewAnalyticsHandler(analyticsService)
	registerAnalyticsRoutes(authed, analyticsHandler)
	registerAdminTeamRoutes(authed, teamHandler)
	registerAdminWriteupRoutes(authed, writeupHandler)
	if instanceHandler != nil {
		registerAdminInstanceRoutes(authed, instanceHandler)
	}
	hintService := services.NewHintService(client)
	hintHandler := NewHintHandler(hintService, teamService)
	registerPortalRoutes(authed, teamHandler, competitionHandler, challengeHandler, flagHandler, scoreboardHandler, writeupHandler, instanceHandler, hintHandler)

	portal := authed.Group("/portal")

	summaryService := services.NewSummaryService(client)
	portal.GET("/competitions/:id/summary", func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid id"))
			return
		}
		result, err := summaryService.Generate(c.Request.Context(), id)
		if err != nil {
			response.AppError(c, apperr.ErrInternal.WithMessage("failed to generate summary: "+err.Error()))
			return
		}
		response.Success(c, result)
	})

	registerPortalObjectiveRoutes(portal, scenarioHandler)
	registerPortalAWDRoutes(portal, awdHandler)

	redblueService := services.NewRedBlueService(client)
	redblueHandler := NewRedBlueHandler(redblueService, teamService)
	registerRedBlueRoutes(authed, redblueHandler)

	awdTimelineService := services.NewAWDTimelineService(client)
	awdTimelineHandler := NewAWDTimelineHandler(awdTimelineService)
	registerAWDTimelineRoutes(authed, portal, awdTimelineHandler)
	registerPortalRedBlueRoutes(portal, redblueHandler)

	r.GET("/uploads/*filepath", uploadHandler.Serve)

	return r
}
