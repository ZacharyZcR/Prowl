package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/models"
	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type AWDHandler struct {
	roundService   *services.ScoringRoundService
	checkerService *services.CheckerService
	awdService     *services.AWDService
	teamService    *services.TeamService
}

func NewAWDHandler(roundService *services.ScoringRoundService, checkerService *services.CheckerService, awdService *services.AWDService, teamService *services.TeamService) *AWDHandler {
	return &AWDHandler{roundService: roundService, checkerService: checkerService, awdService: awdService, teamService: teamService}
}

func (h *AWDHandler) Deploy(c *gin.Context) {
	if h.awdService == nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("docker not available"))
		return
	}
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	result, appErr := h.awdService.DeployServices(c.Request.Context(), compID)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, result)
}

func (h *AWDHandler) Teardown(c *gin.Context) {
	if h.awdService == nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("docker not available"))
		return
	}
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	if appErr := h.awdService.TeardownAWDEnvironment(c.Request.Context(), compID); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, gin.H{"message": "teardown complete"})
}

func (h *AWDHandler) ExecuteRound(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	if appErr := h.roundService.ExecuteRound(c.Request.Context(), compID); appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, gin.H{"message": "round executed"})
}

func (h *AWDHandler) ListRounds(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	rounds, appErr := h.roundService.ListRounds(c.Request.Context(), compID)
	if appErr != nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("failed to list rounds"))
		return
	}
	items := make([]gin.H, 0, len(rounds))
	for _, r := range rounds {
		item := gin.H{
			"id": r.ID, "competition_id": r.CompetitionID,
			"round_number": r.RoundNumber, "status": r.Status,
			"started_at": r.StartedAt.Format("2006-01-02T15:04:05Z"),
			"created_at": r.CreatedAt.Format("2006-01-02T15:04:05Z"),
		}
		if r.EndedAt != nil {
			item["ended_at"] = r.EndedAt.Format("2006-01-02T15:04:05Z")
		}
		items = append(items, item)
	}
	response.Success(c, items)
}

func (h *AWDHandler) GetRoundResults(c *gin.Context) {
	roundID, err := strconv.Atoi(c.Param("rid"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid round id"))
		return
	}
	results, appErr := h.checkerService.GetRoundResults(c.Request.Context(), roundID)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, results)
}

func (h *AWDHandler) GetCurrentRound(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	round, appErr := h.roundService.GetCurrentRound(c.Request.Context(), compID)
	if appErr != nil {
		response.AppError(c, apperr.ErrNotFound.WithMessage("no rounds yet"))
		return
	}
	item := gin.H{
		"id": round.ID, "competition_id": round.CompetitionID,
		"round_number": round.RoundNumber, "status": round.Status,
		"started_at": round.StartedAt.Format("2006-01-02T15:04:05Z"),
	}
	if round.EndedAt != nil {
		item["ended_at"] = round.EndedAt.Format("2006-01-02T15:04:05Z")
	}
	response.Success(c, item)
}

func (h *AWDHandler) SubmitFlag(c *gin.Context) {
	if h.awdService == nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("docker not available"))
		return
	}
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	var req models.SubmitFlagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}

	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	myTeam, appErr := h.teamService.GetByUserID(c.Request.Context(), uid)
	if appErr != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("you must be in a team"))
		return
	}

	resp, appErr := h.awdService.SubmitAWDFlag(c.Request.Context(), compID, myTeam.ID, uid, req.ChallengeID, req.Flag, c.ClientIP())
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, resp)
}

func (h *AWDHandler) MyServices(c *gin.Context) {
	if h.awdService == nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("docker not available"))
		return
	}
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	userID, _ := c.Get("user_id")
	uid, _ := userID.(int)

	myTeam, appErr := h.teamService.GetByUserID(c.Request.Context(), uid)
	if appErr != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("you must be in a team"))
		return
	}

	items, appErr := h.awdService.GetTeamServices(c.Request.Context(), compID, myTeam.ID)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, items)
}

func (h *AWDHandler) GetConfig(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	comp, err := h.roundService.GetClient().Competition.Get(c.Request.Context(), compID)
	if err != nil {
		response.AppError(c, apperr.ErrNotFound.WithMessage("competition not found"))
		return
	}
	cfg := models.AWDConfigResponse{
		RoundInterval: 120, AttackScore: 50, DefenseScore: -50, CheckScore: -30,
	}
	if comp.ScoringConfig != nil {
		if v, ok := comp.ScoringConfig["round_interval"]; ok {
			if f, ok := v.(float64); ok { cfg.RoundInterval = int(f) }
		}
		if v, ok := comp.ScoringConfig["attack_score"]; ok {
			if f, ok := v.(float64); ok { cfg.AttackScore = int(f) }
		}
		if v, ok := comp.ScoringConfig["defense_score"]; ok {
			if f, ok := v.(float64); ok { cfg.DefenseScore = int(f) }
		}
		if v, ok := comp.ScoringConfig["check_score"]; ok {
			if f, ok := v.(float64); ok { cfg.CheckScore = int(f) }
		}
	}
	response.Success(c, cfg)
}

func (h *AWDHandler) UpdateConfig(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	var req models.UpdateAWDConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid request: "+err.Error()))
		return
	}
	comp, err := h.roundService.GetClient().Competition.Get(c.Request.Context(), compID)
	if err != nil {
		response.AppError(c, apperr.ErrNotFound.WithMessage("competition not found"))
		return
	}
	cfg := comp.ScoringConfig
	if cfg == nil {
		cfg = make(map[string]interface{})
	}
	if req.RoundInterval != nil { cfg["round_interval"] = *req.RoundInterval }
	if req.AttackScore != nil { cfg["attack_score"] = *req.AttackScore }
	if req.DefenseScore != nil { cfg["defense_score"] = *req.DefenseScore }
	if req.CheckScore != nil { cfg["check_score"] = *req.CheckScore }

	_, err = h.roundService.GetClient().Competition.UpdateOneID(compID).SetScoringConfig(cfg).Save(c.Request.Context())
	if err != nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("failed to update config"))
		return
	}
	response.Success(c, nil)
}

func (h *AWDHandler) PaidRestart(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}
	chalID, err := strconv.Atoi(c.Param("cid"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid challenge id"))
		return
	}
	uid, _ := c.Get("user_id")
	userID, _ := uid.(int)
	myTeam, appErr := h.teamService.GetByUserID(c.Request.Context(), userID)
	if appErr != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("you must be in a team"))
		return
	}
	if h.awdService == nil {
		response.AppError(c, apperr.ErrInternal.WithMessage("AWD service not available"))
		return
	}
	inst, appErr := h.awdService.PaidRestart(c.Request.Context(), compID, chalID, myTeam.ID)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}
	response.Success(c, inst)
}
