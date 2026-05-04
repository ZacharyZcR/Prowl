package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/internal/middleware"
	"github.com/ZacharyZcR/STC/backend/internal/queue"
	"github.com/ZacharyZcR/STC/backend/internal/server"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	"github.com/ZacharyZcR/STC/backend/pkg/config"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

func registerPublicRoutes(v1 *gin.RouterGroup, cfg *config.Config, client *ent.Client, authService *services.AuthService, authHandler *AuthHandler, healthHandler *HealthHandler, wsHandler *WSHandler, sseHandler *SSEHandler, systemLogHandler *SystemLogHandler, outboundHTTPClient *http.Client) {
	v1.GET("/health", healthHandler.Health)
	v1.GET("/health/deep", healthHandler.DeepHealth)
	v1.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	auth := v1.Group("/auth")
	auth.POST("/login", middleware.RateLimit(10, 20), authHandler.Login)
	auth.POST("/logout", authHandler.Logout)

	if cfg.OAuthEnabled {
		oauthService := services.NewOAuthServiceWithHTTPClient(cfg, client, authService, outboundHTTPClient)
		oauthHandler := NewOAuthHandler(oauthService, cfg)
		auth.GET("/oauth/config", oauthHandler.Config)
		auth.GET("/oauth/login", oauthHandler.Login)
		auth.GET("/oauth/callback", oauthHandler.Callback)
	} else {
		auth.GET("/oauth/config", func(c *gin.Context) {
			response.Success(c, gin.H{"enabled": false, "provider": ""})
		})
	}

	v1.GET("/ws", wsHandler.Handle)
	v1.GET("/sse", sseHandler.Handle)
	v1.GET("/ws/online", wsHandler.OnlineUsers)
	v1.GET("/system-logs/stream", systemLogHandler.Stream)
}

func registerPermissionRoutes(authed *gin.RouterGroup, permissionHandler *PermissionHandler) {
	authed.GET("/permissions", permissionHandler.List)
	authed.GET("/permissions/categories", permissionHandler.ListByCategory)
}

func registerUserRoutes(authed *gin.RouterGroup, userHandler *UserHandler) {
	users := authed.Group("/users")
	users.GET("/me", userHandler.GetMe)
	users.PUT("/me", userHandler.UpdateMe)
	users.PUT("/me/password", userHandler.ChangePassword)
	users.GET("", middleware.RequirePermission("user:read"), userHandler.List)
	users.GET("/:id", middleware.RequirePermission("user:read"), userHandler.GetByID)
	users.POST("", middleware.RequirePermission("user:create"), userHandler.Create)
	users.PUT("/:id", middleware.RequirePermission("user:update"), userHandler.Update)
	users.DELETE("/:id", middleware.RequirePermission("user:delete"), userHandler.Delete)
	users.POST("/batch-delete", middleware.RequirePermission("user:delete"), userHandler.BatchDelete)
}

func registerRoleRoutes(authed *gin.RouterGroup, roleHandler *RoleHandler) {
	roles := authed.Group("/roles")
	roles.GET("", middleware.RequirePermission("role:read"), roleHandler.List)
	roles.GET("/:id", middleware.RequirePermission("role:read"), roleHandler.GetByID)
	roles.POST("", middleware.RequirePermission("role:create"), roleHandler.Create)
	roles.PUT("/:id", middleware.RequirePermission("role:update"), roleHandler.Update)
	roles.DELETE("/:id", middleware.RequirePermission("role:delete"), roleHandler.Delete)
	roles.POST("/batch-delete", middleware.RequirePermission("role:delete"), roleHandler.BatchDelete)
}

func registerProjectRoutes(authed *gin.RouterGroup, projectHandler *ProjectHandler) {
	projects := authed.Group("/projects")
	projects.GET("", middleware.RequirePermission("project:read"), projectHandler.List)
	projects.GET("/:id", middleware.RequirePermission("project:read"), projectHandler.GetByID)
	projects.POST("", middleware.RequirePermission("project:create"), projectHandler.Create)
	projects.PUT("/:id", middleware.RequirePermission("project:update"), projectHandler.Update)
	projects.DELETE("/:id", middleware.RequirePermission("project:delete"), projectHandler.Delete)
	projects.POST("/batch-delete", middleware.RequirePermission("project:delete"), projectHandler.BatchDelete)
}

func registerActivityRoutes(authed *gin.RouterGroup, activityHandler *ActivityHandler, loginLogHandler *LoginLogHandler) {
	activities := authed.Group("/activities")
	activities.GET("", middleware.RequirePermission("activity:read"), activityHandler.List)
	activities.GET("/statistics", middleware.RequirePermission("activity:read"), activityHandler.Statistics)
	activities.GET("/export", middleware.RequirePermission("activity:read"), activityHandler.Export)

	loginLogs := authed.Group("/login-logs")
	loginLogs.GET("", middleware.RequirePermission("activity:read"), loginLogHandler.List)
	loginLogs.GET("/statistics", middleware.RequirePermission("activity:read"), loginLogHandler.Statistics)
}

func registerFileRoutes(authed *gin.RouterGroup, uploadHandler *UploadHandler) {
	files := authed.Group("/files")
	files.POST("/upload", middleware.RequirePermission("upload:create"), uploadHandler.Upload)
	files.GET("", uploadHandler.List)
	files.GET("/:id", uploadHandler.GetByID)
	files.DELETE("/:id", uploadHandler.Delete)
}

func registerNotificationRoutes(authed *gin.RouterGroup, notificationHandler *NotificationHandler) {
	notifications := authed.Group("/notifications")
	notifications.GET("", notificationHandler.List)
	notifications.GET("/unread-count", notificationHandler.UnreadCount)
	notifications.PUT("/:id/read", notificationHandler.MarkRead)
	notifications.PUT("/read-all", notificationHandler.MarkAllRead)
	notifications.POST("", middleware.RequirePermission("notification:create"), notificationHandler.Create)
}

func registerErrorRoutes(v1 *gin.RouterGroup, authed *gin.RouterGroup, errorLogHandler *ErrorLogHandler, systemLogHandler *SystemLogHandler) {
	// Report endpoint is public — sendBeacon cannot send Authorization headers
	v1.POST("/error-logs/report", errorLogHandler.Report)

	errorLogs := authed.Group("/error-logs")
	errorLogs.GET("", middleware.RequirePermission("error_log:read"), errorLogHandler.List)
	errorLogs.GET("/statistics", middleware.RequirePermission("error_log:read"), errorLogHandler.Statistics)
	errorLogs.GET("/:id", middleware.RequirePermission("error_log:read"), errorLogHandler.GetByID)
	errorLogs.PUT("/:id/resolve", middleware.RequirePermission("error_log:update"), errorLogHandler.Resolve)
	errorLogs.PUT("/:id/unresolve", middleware.RequirePermission("error_log:update"), errorLogHandler.Unresolve)
	errorLogs.POST("/bulk-resolve", middleware.RequirePermission("error_log:update"), errorLogHandler.BulkResolve)

	authed.GET("/system-logs", middleware.RequirePermission("system:settings"), systemLogHandler.Recent)
}

func registerManagementRoutes(v1 *gin.RouterGroup, authed *gin.RouterGroup, client *ent.Client, rdb *redis.Client, outboundHTTPClient *http.Client, sseBroker *server.SSEBroker, taskQueue *queue.Queue, cronService *services.CronService, apiKeyService *services.APIKeyService, authService *services.AuthService, preferenceService *services.PreferenceService, uploadService *services.UploadService, dispatcher *services.NotificationDispatcher) {
	webhookService := services.NewWebhookServiceWithHTTPClient(client, outboundHTTPClient)
	webhookHandler := NewWebhookHandler(webhookService)
	registerWebhookRoutes(authed, webhookHandler)

	healthService := services.NewHealthService(client, rdb)
	healthMonitorHandler := NewHealthMonitorHandler(healthService)
	authed.GET("/health/monitor", middleware.RequirePermission("system:settings"), healthMonitorHandler.SystemHealth)
	authed.GET("/health/metrics", middleware.RequirePermission("system:settings"), healthMonitorHandler.Metrics)

	settingService := services.NewSettingService(client)
	dispatcher.Register(&services.EmailNotifier{SettingService: settingService})
	dispatcher.Register(&services.WebhookNotifier{WebhookService: webhookService})
	settingHandler := NewSettingHandler(settingService)
	registerSettingRoutes(authed, settingHandler)

	aiService := services.NewAIService(client)
	aiHandler := NewAIHandler(aiService)
	registerAIRoutes(authed, aiHandler)

	exportService := services.NewExportService(client)
	importService := services.NewImportService(client)
	progressTracker := services.NewProgressTracker(sseBroker)
	dataHandler := NewDataHandler(exportService, importService, uploadService, progressTracker, taskQueue)
	dataHandler.RegisterTaskHandlers()
	registerDataRoutes(authed, dataHandler)

	queueHandler := NewQueueHandler(taskQueue, authService)
	registerQueueRoutes(v1, authed, queueHandler)

	cronHandler := NewCronHandler(cronService)
	registerCronRoutes(authed, cronHandler)

	announcementService := services.NewAnnouncementService(client)
	announcementHandler := NewAnnouncementHandler(announcementService)
	registerAnnouncementRoutes(authed, announcementHandler)

	dictService := services.NewDictService(client)
	dictHandler := NewDictHandler(dictService)
	registerDictRoutes(authed, dictHandler)

	apiKeyHandler := NewAPIKeyHandler(apiKeyService)
	registerAPIKeyRoutes(authed, apiKeyHandler)

	preferenceHandler := NewPreferenceHandler(preferenceService)
	authed.GET("/preferences", preferenceHandler.GetAll)
	authed.PUT("/preferences", preferenceHandler.Set)
}

func registerWebhookRoutes(authed *gin.RouterGroup, webhookHandler *WebhookHandler) {
	webhooks := authed.Group("/webhooks")
	webhooks.GET("", middleware.RequirePermission("system:settings"), webhookHandler.List)
	webhooks.GET("/:id", middleware.RequirePermission("system:settings"), webhookHandler.GetByID)
	webhooks.POST("", middleware.RequirePermission("system:settings"), webhookHandler.Create)
	webhooks.PUT("/:id", middleware.RequirePermission("system:settings"), webhookHandler.Update)
	webhooks.DELETE("/:id", middleware.RequirePermission("system:settings"), webhookHandler.Delete)
	webhooks.PUT("/:id/toggle", middleware.RequirePermission("system:settings"), webhookHandler.Toggle)
	webhooks.POST("/:id/test", middleware.RequirePermission("system:settings"), webhookHandler.Test)
}

func registerSettingRoutes(authed *gin.RouterGroup, settingHandler *SettingHandler) {
	settings := authed.Group("/settings/system")
	settings.GET("", middleware.RequirePermission("system:settings"), settingHandler.List)
	settings.PUT("", middleware.RequirePermission("system:settings"), settingHandler.Update)
	settings.GET("/:group", middleware.RequirePermission("system:settings"), settingHandler.GetGroup)
}

func registerAIRoutes(authed *gin.RouterGroup, aiHandler *AIHandler) {
	ai := authed.Group("/ai")
	ai.GET("/config", middleware.RequirePermission("system:settings"), aiHandler.GetConfig)
	ai.PUT("/config", middleware.RequirePermission("system:settings"), aiHandler.UpdateConfig)
	ai.GET("/conversations", aiHandler.ListConversations)
	ai.POST("/conversations", aiHandler.CreateConversation)
	ai.DELETE("/conversations/:id", aiHandler.DeleteConversation)
	ai.GET("/conversations/:id/messages", aiHandler.GetMessages)
	ai.POST("/conversations/:id/chat", aiHandler.StreamChat)
}

func registerDataRoutes(authed *gin.RouterGroup, dataHandler *DataHandler) {
	dataRoutes := authed.Group("/data")
	dataRoutes.GET("/export/users", middleware.RequirePermission("user:read"), dataHandler.ExportUsers)
	dataRoutes.GET("/export/projects", middleware.RequirePermission("project:read"), dataHandler.ExportProjects)
	dataRoutes.GET("/export/roles", middleware.RequirePermission("role:read"), dataHandler.ExportRoles)
	dataRoutes.POST("/import/users", middleware.RequirePermission("user:create"), dataHandler.ImportUsers)
	dataRoutes.POST("/import/projects", middleware.RequirePermission("project:create"), dataHandler.ImportProjects)
	dataRoutes.POST("/async-export/users", middleware.RequirePermission("user:read"), dataHandler.AsyncExportUsers)
	dataRoutes.POST("/async-export/projects", middleware.RequirePermission("project:read"), dataHandler.AsyncExportProjects)
	dataRoutes.POST("/async-export/roles", middleware.RequirePermission("role:read"), dataHandler.AsyncExportRoles)
	dataRoutes.POST("/async-import/users", middleware.RequirePermission("user:create"), dataHandler.AsyncImportUsers)
	dataRoutes.POST("/async-import/projects", middleware.RequirePermission("project:create"), dataHandler.AsyncImportProjects)
}

func registerQueueRoutes(v1 *gin.RouterGroup, authed *gin.RouterGroup, queueHandler *QueueHandler) {
	queueRoutes := authed.Group("/queue")
	queueRoutes.GET("/stats", middleware.RequirePermission("system:settings"), queueHandler.Stats)
	queueRoutes.GET("/tasks", middleware.RequirePermission("system:settings"), queueHandler.ListTasks)
	queueRoutes.POST("/tasks", middleware.RequirePermission("system:settings"), queueHandler.Enqueue)

	v1.GET("/queue/stream", queueHandler.Stream)
}

func registerCronRoutes(authed *gin.RouterGroup, cronHandler *CronHandler) {
	cronJobs := authed.Group("/cron-jobs")
	cronJobs.GET("", middleware.RequirePermission("cron:read"), cronHandler.List)
	cronJobs.POST("", middleware.RequirePermission("cron:create"), cronHandler.Create)
	cronJobs.PUT("/:id", middleware.RequirePermission("cron:update"), cronHandler.Update)
	cronJobs.DELETE("/:id", middleware.RequirePermission("cron:delete"), cronHandler.Delete)
	cronJobs.PUT("/:id/toggle", middleware.RequirePermission("cron:update"), cronHandler.Toggle)
	cronJobs.POST("/:id/run", middleware.RequirePermission("cron:update"), cronHandler.RunNow)
}

func registerAnnouncementRoutes(authed *gin.RouterGroup, announcementHandler *AnnouncementHandler) {
	announcements := authed.Group("/announcements")
	announcements.GET("", middleware.RequirePermission("announcement:read"), announcementHandler.List)
	announcements.GET("/active", announcementHandler.ListActive)
	announcements.GET("/:id", middleware.RequirePermission("announcement:read"), announcementHandler.GetByID)
	announcements.POST("", middleware.RequirePermission("announcement:create"), announcementHandler.Create)
	announcements.PUT("/:id", middleware.RequirePermission("announcement:update"), announcementHandler.Update)
	announcements.DELETE("/:id", middleware.RequirePermission("announcement:delete"), announcementHandler.Delete)
	announcements.PUT("/:id/publish", middleware.RequirePermission("announcement:update"), announcementHandler.Publish)
	announcements.PUT("/:id/unpublish", middleware.RequirePermission("announcement:update"), announcementHandler.Unpublish)
}

func registerDictRoutes(authed *gin.RouterGroup, dictHandler *DictHandler) {
	dicts := authed.Group("/dicts")
	dicts.GET("", middleware.RequirePermission("dict:read"), dictHandler.ListAll)
	dicts.GET("/groups", middleware.RequirePermission("dict:read"), dictHandler.ListGroups)
	dicts.GET("/:group", middleware.RequirePermission("dict:read"), dictHandler.ListByGroup)
	dicts.POST("", middleware.RequirePermission("dict:create"), dictHandler.Create)
	dicts.PUT("/:id", middleware.RequirePermission("dict:update"), dictHandler.Update)
	dicts.PUT("/:id/toggle", middleware.RequirePermission("dict:update"), dictHandler.Toggle)
	dicts.DELETE("/:id", middleware.RequirePermission("dict:delete"), dictHandler.Delete)
}

func registerAPIKeyRoutes(authed *gin.RouterGroup, apiKeyHandler *APIKeyHandler) {
	apiKeys := authed.Group("/api-keys")
	apiKeys.GET("", apiKeyHandler.List)
	apiKeys.POST("", apiKeyHandler.Generate)
	apiKeys.DELETE("/:id", apiKeyHandler.Revoke)
}

func registerChallengeRoutes(authed *gin.RouterGroup, challengeHandler *ChallengeHandler) {
	challenges := authed.Group("/challenges")
	challenges.GET("", middleware.RequirePermission("challenge:read"), challengeHandler.List)
	challenges.GET("/:id", middleware.RequirePermission("challenge:read"), challengeHandler.GetByID)
	challenges.POST("", middleware.RequirePermission("challenge:create"), challengeHandler.Create)
	challenges.PUT("/:id", middleware.RequirePermission("challenge:update"), challengeHandler.Update)
	challenges.DELETE("/:id", middleware.RequirePermission("challenge:delete"), challengeHandler.Delete)
	challenges.POST("/:id/hints", middleware.RequirePermission("challenge:update"), challengeHandler.CreateHint)
	challenges.PUT("/:id/hints/:hid", middleware.RequirePermission("challenge:update"), challengeHandler.UpdateHint)
	challenges.DELETE("/:id/hints/:hid", middleware.RequirePermission("challenge:update"), challengeHandler.DeleteHint)
}

func registerChallengePackRoutes(authed *gin.RouterGroup, packHandler *ChallengePackHandler) {
	packs := authed.Group("/challenge-packs")
	packs.GET("/export", middleware.RequirePermission("challenge:read"), packHandler.Export)
	packs.POST("/import", middleware.RequirePermission("challenge:create"), packHandler.Import)
}

func registerCompetitionRoutes(authed *gin.RouterGroup, competitionHandler *CompetitionHandler, flagHandler *FlagHandler, scoreboardHandler *ScoreboardHandler) {
	competitions := authed.Group("/competitions")
	competitions.GET("", middleware.RequirePermission("competition:read"), competitionHandler.List)
	competitions.GET("/:id", middleware.RequirePermission("competition:read"), competitionHandler.GetByID)
	competitions.POST("", middleware.RequirePermission("competition:create"), competitionHandler.Create)
	competitions.PUT("/:id", middleware.RequirePermission("competition:update"), competitionHandler.Update)
	competitions.DELETE("/:id", middleware.RequirePermission("competition:delete"), competitionHandler.Delete)
	competitions.PUT("/:id/status", middleware.RequirePermission("competition:update"), competitionHandler.UpdateStatus)
	competitions.POST("/:id/challenges", middleware.RequirePermission("competition:update"), competitionHandler.AttachChallenge)
	competitions.DELETE("/:id/challenges/:cid", middleware.RequirePermission("competition:update"), competitionHandler.DetachChallenge)
	competitions.GET("/:id/challenges-list", middleware.RequirePermission("competition:read"), competitionHandler.ListChallenges)
	competitions.POST("/:id/challenges/batch", middleware.RequirePermission("competition:update"), competitionHandler.BatchAttach)
	competitions.PUT("/:id/challenges/release", middleware.RequirePermission("competition:update"), competitionHandler.ReleaseChallenges)
	competitions.GET("/:id/registrations", middleware.RequirePermission("competition:read"), competitionHandler.ListRegistrations)
	competitions.PUT("/:id/registrations/:rid", middleware.RequirePermission("competition:update"), competitionHandler.ReviewRegistration)
	competitions.GET("/:id/submissions", middleware.RequirePermission("competition:read"), flagHandler.ListSubmissions)
	competitions.GET("/:id/scoreboard", middleware.RequirePermission("competition:read"), scoreboardHandler.GetScoreboard)
}

func registerExportCompetitionRoutes(authed *gin.RouterGroup, exportHandler *ExportCompetitionHandler) {
	exports := authed.Group("/competitions")
	exports.GET("/:id/export/ranking", middleware.RequirePermission("competition:read"), exportHandler.ExportRanking)
	exports.GET("/:id/export/submissions", middleware.RequirePermission("competition:read"), exportHandler.ExportSubmissions)
}

func registerAdminTeamRoutes(authed *gin.RouterGroup, teamHandler *TeamHandler) {
	adminTeams := authed.Group("/admin/teams")
	adminTeams.GET("", middleware.RequirePermission("team:read"), teamHandler.List)
	adminTeams.GET("/:id", middleware.RequirePermission("team:read"), teamHandler.GetByID)
	adminTeams.DELETE("/:id", middleware.RequirePermission("team:delete"), teamHandler.Delete)
}

func registerAdminWriteupRoutes(authed *gin.RouterGroup, writeupHandler *WriteupHandler) {
	adminWriteups := authed.Group("/admin/writeups")
	adminWriteups.GET("", middleware.RequirePermission("writeup:read"), writeupHandler.List)
	adminWriteups.PUT("/:id/review", middleware.RequirePermission("writeup:update"), writeupHandler.Review)
}

func registerAntiCheatRoutes(authed *gin.RouterGroup, antiCheatHandler *AntiCheatHandler) {
	authed.GET("/competitions/:id/anticheat", middleware.RequirePermission("competition:read"), antiCheatHandler.Report)
}

func registerAnalyticsRoutes(authed *gin.RouterGroup, analyticsHandler *AnalyticsHandler) {
	authed.GET("/competitions/:id/analytics", middleware.RequirePermission("competition:read"), analyticsHandler.GetAnalytics)
}

func registerScenarioRoutes(authed *gin.RouterGroup, scenarioHandler *ScenarioHandler) {
	scenarios := authed.Group("/scenarios")
	scenarios.GET("", middleware.RequirePermission("competition:read"), scenarioHandler.ListScenarios)
	scenarios.GET("/:id", middleware.RequirePermission("competition:read"), scenarioHandler.GetScenario)
	scenarios.POST("", middleware.RequirePermission("competition:create"), scenarioHandler.CreateScenario)
	scenarios.PUT("/:id", middleware.RequirePermission("competition:update"), scenarioHandler.UpdateScenario)
	scenarios.DELETE("/:id", middleware.RequirePermission("competition:delete"), scenarioHandler.DeleteScenario)

	compObjectives := authed.Group("/competitions")
	compObjectives.GET("/:id/objectives", middleware.RequirePermission("competition:read"), scenarioHandler.ListObjectives)
	compObjectives.POST("/:id/objectives", middleware.RequirePermission("competition:update"), scenarioHandler.CreateObjective)
	compObjectives.POST("/:id/objectives/batch", middleware.RequirePermission("competition:update"), scenarioHandler.BatchCreateObjectives)
	compObjectives.POST("/:id/objectives/auto-assign", middleware.RequirePermission("competition:update"), scenarioHandler.AutoAssignObjectives)
	compObjectives.PUT("/:id/objectives/:oid/judge", middleware.RequirePermission("scoreboard:manage"), scenarioHandler.JudgeObjective)
	compObjectives.PUT("/:id/objectives/:oid/assign", middleware.RequirePermission("competition:update"), scenarioHandler.AssignObjective)
	compObjectives.POST("/:id/judge-score", middleware.RequirePermission("scoreboard:manage"), scenarioHandler.JudgeScore)
}

func registerPortalAuthRoutes(v1 *gin.RouterGroup, portalAuthHandler *PortalAuthHandler) {
	portalAuth := v1.Group("/portal/auth")
	portalAuth.POST("/register", portalAuthHandler.Register)
}

func registerPortalObjectiveRoutes(portal *gin.RouterGroup, scenarioHandler *ScenarioHandler) {
	portal.GET("/competitions/:id/objectives", scenarioHandler.ListObjectives)
	portal.POST("/competitions/:id/objectives/:oid/evidence", scenarioHandler.SubmitEvidence)
}

func registerAWDRoutes(authed *gin.RouterGroup, awdHandler *AWDHandler) {
	awd := authed.Group("/competitions")
	awd.POST("/:id/awd/deploy", middleware.RequirePermission("competition:update"), awdHandler.Deploy)
	awd.POST("/:id/awd/teardown", middleware.RequirePermission("competition:update"), awdHandler.Teardown)
	awd.POST("/:id/rounds/execute", middleware.RequirePermission("competition:update"), awdHandler.ExecuteRound)
	awd.GET("/:id/rounds", middleware.RequirePermission("competition:read"), awdHandler.ListRounds)
	awd.GET("/:id/rounds/current", awdHandler.GetCurrentRound)
	awd.GET("/:id/rounds/:rid/results", middleware.RequirePermission("competition:read"), awdHandler.GetRoundResults)
	awd.GET("/:id/awd/config", middleware.RequirePermission("competition:read"), awdHandler.GetConfig)
	awd.PUT("/:id/awd/config", middleware.RequirePermission("competition:update"), awdHandler.UpdateConfig)
}

func registerAWDTimelineRoutes(authed *gin.RouterGroup, portal *gin.RouterGroup, timelineHandler *AWDTimelineHandler) {
	authed.GET("/competitions/:id/awd/timeline", middleware.RequirePermission("competition:read"), timelineHandler.GetTimeline)
	portal.GET("/competitions/:id/awd/timeline", timelineHandler.GetTimeline)
}

func registerPortalAWDRoutes(portal *gin.RouterGroup, awdHandler *AWDHandler) {
	portalAWD := portal.Group("/competitions")
	portalAWD.POST("/:id/awd/flags", awdHandler.SubmitFlag)
	portalAWD.GET("/:id/awd/services", awdHandler.MyServices)
	portalAWD.POST("/:id/awd/services/:cid/restart", awdHandler.PaidRestart)
	portalAWD.GET("/:id/rounds/current", awdHandler.GetCurrentRound)
}

func registerRedBlueRoutes(authed *gin.RouterGroup, redblueHandler *RedBlueHandler) {
	rb := authed.Group("/competitions")
	rb.GET("/:id/attack-reports", middleware.RequirePermission("competition:read"), redblueHandler.ListAttackReports)
	rb.GET("/:id/defense-reports", middleware.RequirePermission("competition:read"), redblueHandler.ListDefenseReports)
	rb.PUT("/:id/attack-reports/:rid/judge", middleware.RequirePermission("scoreboard:manage"), redblueHandler.JudgeAttackReport)
	rb.PUT("/:id/defense-reports/:rid/judge", middleware.RequirePermission("scoreboard:manage"), redblueHandler.JudgeDefenseReport)
	rb.GET("/:id/phases", middleware.RequirePermission("competition:read"), redblueHandler.ListPhases)
	rb.POST("/:id/phases", middleware.RequirePermission("competition:update"), redblueHandler.CreatePhase)
	rb.POST("/:id/phases/advance", middleware.RequirePermission("competition:update"), redblueHandler.AdvancePhase)
}

func registerPortalRedBlueRoutes(portal *gin.RouterGroup, redblueHandler *RedBlueHandler) {
	prb := portal.Group("/competitions")
	prb.POST("/:id/attack-reports", redblueHandler.SubmitAttackReport)
	prb.POST("/:id/defense-reports", redblueHandler.SubmitDefenseReport)
	prb.GET("/:id/attack-reports/my", redblueHandler.MyAttackReports)
	prb.GET("/:id/defense-reports/my", redblueHandler.MyDefenseReports)
	prb.GET("/:id/phases", redblueHandler.ListPhases)
	prb.GET("/:id/attack-reports", redblueHandler.ListAttackReports)
	prb.GET("/:id/defense-reports", redblueHandler.ListDefenseReports)
	prb.PUT("/:id/attack-reports/:rid/judge", redblueHandler.JudgeAttackReport)
	prb.PUT("/:id/defense-reports/:rid/judge", redblueHandler.JudgeDefenseReport)
	prb.POST("/:id/phases", redblueHandler.CreatePhase)
	prb.POST("/:id/phases/advance", redblueHandler.AdvancePhase)
	prb.GET("/:id/exercise-summary", redblueHandler.GetExerciseSummary)
}

func registerAdminInstanceRoutes(authed *gin.RouterGroup, instanceHandler *InstanceHandler) {
	adminInstances := authed.Group("/admin/instances")
	adminInstances.GET("", middleware.RequirePermission("container:read"), instanceHandler.List)
	adminInstances.GET("/stats", middleware.RequirePermission("container:read"), instanceHandler.Stats)
	adminInstances.DELETE("/:id", middleware.RequirePermission("container:delete"), instanceHandler.ForceRemove)
}

func registerDockerRoutes(authed *gin.RouterGroup, dockerHandler *DockerHandler) {
	docker := authed.Group("/admin/docker")
	docker.GET("/images", middleware.RequirePermission("container:read"), dockerHandler.ListImages)
	docker.POST("/images/pull", middleware.RequirePermission("container:delete"), dockerHandler.PullImage)
	docker.DELETE("/images/:imageId", middleware.RequirePermission("container:delete"), dockerHandler.RemoveImage)
	docker.PUT("/instances/:id/renew", middleware.RequirePermission("container:delete"), dockerHandler.RenewInstance)
	docker.POST("/instances/cleanup", middleware.RequirePermission("container:delete"), dockerHandler.BatchCleanup)
}

func registerPortalRoutes(authed *gin.RouterGroup, teamHandler *TeamHandler, competitionHandler *CompetitionHandler, challengeHandler *ChallengeHandler, flagHandler *FlagHandler, scoreboardHandler *ScoreboardHandler, writeupHandler *WriteupHandler, instanceHandler *InstanceHandler, hintHandler *HintHandler) {
	portal := authed.Group("/portal")

	portalTeams := portal.Group("/teams")
	portalTeams.POST("", teamHandler.Create)
	portalTeams.GET("/my", teamHandler.GetMyTeam)
	portalTeams.GET("/my/competitions", teamHandler.GetMyCompetitions)
	portalTeams.PUT("/my", teamHandler.UpdateMyTeam)
	portalTeams.POST("/join", teamHandler.Join)
	portalTeams.DELETE("/my/leave", teamHandler.Leave)
	portalTeams.DELETE("/my/members/:uid", teamHandler.KickMember)

	portalComps := portal.Group("/competitions")
	portalComps.GET("", competitionHandler.ListPublic)
	portalComps.GET("/:id", competitionHandler.PortalGetByID)
	portalComps.POST("/:id/register", teamHandler.RegisterForCompetition)
	portalComps.GET("/:id/challenges", challengeHandler.PortalList)
	portalComps.POST("/:id/flags", flagHandler.Submit)
	portalComps.POST("/:id/challenges/:cid/hints/:hid/unlock", hintHandler.Unlock)
	portalComps.GET("/:id/scoreboard", scoreboardHandler.GetScoreboard)
	portalComps.POST("/:id/writeups", writeupHandler.Create)
	portalComps.GET("/:id/writeups/my", writeupHandler.MyWriteups)

	if instanceHandler != nil {
		portalComps.POST("/:id/challenges/:cid/instance", instanceHandler.PortalStart)
		portalComps.DELETE("/:id/challenges/:cid/instance", instanceHandler.PortalStop)
		portalComps.GET("/:id/challenges/:cid/instance", instanceHandler.PortalStatus)
	}
}
