package handlers

import (
	"encoding/csv"
	"fmt"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/services"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type ExportCompetitionHandler struct {
	scoreboard *services.ScoreboardService
	flag       *services.FlagService
}

func NewExportCompetitionHandler(scoreboard *services.ScoreboardService, flag *services.FlagService) *ExportCompetitionHandler {
	return &ExportCompetitionHandler{scoreboard: scoreboard, flag: flag}
}

func (h *ExportCompetitionHandler) ExportRanking(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}

	sb, appErr := h.scoreboard.GetScoreboardDirect(c.Request.Context(), compID)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=ranking_%d.csv", compID))
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Writer.Write([]byte{0xEF, 0xBB, 0xBF})

	w := csv.NewWriter(c.Writer)
	w.Write([]string{"排名", "战队", "总分", "解题数", "最后解题时间"})

	for _, t := range sb.Teams {
		w.Write([]string{
			strconv.Itoa(t.Rank),
			t.TeamName,
			strconv.Itoa(t.TotalScore),
			strconv.Itoa(t.SolveCount),
			t.LastSolveAt,
		})
	}
	w.Flush()
}

func (h *ExportCompetitionHandler) ExportSubmissions(c *gin.Context) {
	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.AppError(c, apperr.ErrBadRequest.WithMessage("invalid competition id"))
		return
	}

	q := &services.SubmissionExportQuery{CompetitionID: compID}
	subs, appErr := h.flag.ExportSubmissions(c.Request.Context(), q)
	if appErr != nil {
		response.AppError(c, appErr.(*apperr.AppError))
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=submissions_%d.csv", compID))
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Writer.Write([]byte{0xEF, 0xBB, 0xBF})

	w := csv.NewWriter(c.Writer)
	w.Write([]string{"时间", "战队", "用户", "题目", "提交Flag", "正确", "得分", "First Blood", "IP"})

	for _, s := range subs {
		w.Write([]string{
			s.SubmittedAt,
			s.TeamName,
			s.Username,
			s.ChallengeName,
			s.SubmittedFlag,
			strconv.FormatBool(s.IsCorrect),
			strconv.Itoa(s.PointsAwarded),
			strconv.FormatBool(s.IsFirstBlood),
			s.IP,
		})
	}
	w.Flush()
}
