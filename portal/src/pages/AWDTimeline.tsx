import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";

interface TeamRoundScore { team_id: number; team_name: string; round_score: number; total_score: number; attack: number; defense: number; check: number; }
interface RoundSnapshot { round_number: number; teams: TeamRoundScore[]; }

const MEDAL = ["🥇", "🥈", "🥉"];

export default function AWDTimeline() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const compId = Number(id);
  const navigate = useNavigate();

  const { data: timeline, isLoading } = useQuery({
    queryKey: ["portal-awd-timeline", compId],
    queryFn: () => api.get<RoundSnapshot[]>(`/api/v1/portal/competitions/${compId}/awd/timeline`).then((r) => r.data),
    refetchInterval: 10_000,
  });

  if (isLoading) return <div className="portal-empty">{t("common.loading")}</div>;
  if (!timeline || timeline.length === 0) return <div className="portal-empty">{t("common.noData")}</div>;

  const latestRound = timeline[timeline.length - 1];
  const sortedTeams = [...latestRound.teams].sort((a, b) => b.total_score - a.total_score);

  return (
    <div>
      <button onClick={() => navigate(`/competitions/${compId}`)} className="comp-back" type="button">
        <ArrowLeft size={16} /> {t("competition.backToComp")}
      </button>

      <div className="portal-page-header">
        <h1><Clock size={22} /> AWD 轮次回放</h1>
        <p>共 {timeline.length} 轮</p>
      </div>

      <section className="portal-section">
        <div className="portal-section__title">当前排名</div>
        <div className="scoreboard">
          <table>
            <thead>
              <tr>
                <th className="rank">{t("scoreboard.rank")}</th>
                <th>{t("scoreboard.teamName")}</th>
                <th className="score">{t("scoreboard.totalScore")}</th>
                <th className="score" style={{ color: "var(--yza-color-success-600)" }}>{t("scoreboard.attack")}</th>
                <th className="score" style={{ color: "var(--yza-color-danger-600)" }}>{t("scoreboard.defense")}</th>
                <th className="score" style={{ color: "var(--yza-color-warning-600)" }}>{t("scoreboard.availability")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team, i) => (
                <tr key={team.team_id} className={i < 3 ? "scoreboard-top3" : ""}>
                  <td className="rank">{i < 3 ? MEDAL[i] : i + 1}</td>
                  <td className="team-name">{team.team_name}</td>
                  <td className="score">{team.total_score}</td>
                  <td className="score" style={{ color: "var(--yza-color-success-600)" }}>+{team.attack}</td>
                  <td className="score" style={{ color: "var(--yza-color-danger-600)" }}>{team.defense}</td>
                  <td className="score" style={{ color: "var(--yza-color-warning-600)" }}>{team.check}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="portal-section">
        <div className="portal-section__title">轮次明细</div>
        <div className="scoreboard" style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th style={{ position: "sticky", left: 0, background: "var(--yza-surface-raised)", zIndex: 1 }}>{t("scoreboard.teamName")}</th>
                {timeline.map((r) => (
                  <th key={r.round_number} style={{ textAlign: "center", minWidth: 60 }}>R{r.round_number}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team) => (
                <tr key={team.team_id}>
                  <td style={{ fontWeight: 600, position: "sticky", left: 0, background: "var(--yza-surface-canvas)", zIndex: 1 }}>{team.team_name}</td>
                  {timeline.map((round) => {
                    const ts = round.teams.find((ts) => ts.team_id === team.team_id);
                    const score = ts?.round_score ?? 0;
                    return (
                      <td key={round.round_number} style={{
                        textAlign: "center", fontWeight: score !== 0 ? 600 : 400, fontVariantNumeric: "tabular-nums",
                        color: score > 0 ? "var(--yza-color-success-600)" : score < 0 ? "var(--yza-color-danger-600)" : "var(--yza-text-muted)",
                      }}>
                        {score > 0 ? `+${score}` : score}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
