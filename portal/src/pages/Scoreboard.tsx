import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Tag } from "@yza/ui";
import { useScoreboard } from "@/hooks/usePortal";
import { useSSE } from "@/hooks/useSSE";
import { toast } from "sonner";
import { ArrowLeft, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

const RANK_MEDAL = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
const ROLE_TONE: Record<string, "danger" | "info" | "neutral"> = { red: "danger", blue: "info", participant: "neutral" };

export default function Scoreboard() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const compId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, error } = useScoreboard(compId);

  useSSE((msg) => {
    if (msg.event === "scoreboard_update" && msg.data?.competition_id === compId)
      qc.invalidateQueries({ queryKey: ["portal-scoreboard", compId] });
    if (msg.event === "first_blood" && msg.data?.competition_id === compId)
      toast.success(`First Blood! ${msg.data.team_name} 解出了 ${msg.data.challenge_name}`, { duration: 8000 });
  });

  if (isLoading) return <div className="portal-empty">{t("common.loading")}</div>;
  if (error || !data) return <div className="portal-empty" style={{ color: "var(--yza-color-danger-600)" }}>{t("common.loadFailed")}</div>;

  const isAWD = data.mode === "awd";
  const isRedBlue = data.mode === "red_blue";

  return (
    <div>
      <button onClick={() => navigate(`/competitions/${compId}`)} className="comp-back" type="button">
        <ArrowLeft size={16} /> {t("competition.backToComp")}
      </button>

      <div className="portal-page-header">
        <div className="portal-page-header__row">
          <div>
            <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {t("scoreboard.title")}
              {isAWD && <Tag tone="danger">AWD</Tag>}
              {isRedBlue && <Tag tone="warning">红蓝</Tag>}
            </h1>
            <p style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {data.is_frozen && <><Lock size={13} /> <span style={{ color: "var(--yza-color-warning-600)", fontWeight: 600 }}>{t("scoreboard.frozen")}</span> · </>}
              {t("scoreboard.updatedAt")} {data.updated_at.replace("T", " ").slice(0, 19)}
            </p>
          </div>
        </div>
      </div>

      <div className="scoreboard">
        {data.is_frozen && (
          <div className="scoreboard-frozen-bar">
            <Lock size={14} /> {t("scoreboard.frozenHint")}
          </div>
        )}
        <table>
          <thead>
            <tr>
              <th className="rank">{t("scoreboard.rank")}</th>
              <th>{t("scoreboard.teamName")}</th>
              {isRedBlue && <th style={{ width: 70, textAlign: "center" }}>{t("table.role")}</th>}
              <th className="score">{t("scoreboard.totalScore")}</th>
              {isAWD ? (
                <>
                  <th className="score" style={{ color: "var(--yza-color-success-600)" }}>{t("scoreboard.attack")}</th>
                  <th className="score" style={{ color: "var(--yza-color-danger-600)" }}>{t("scoreboard.defense")}</th>
                  <th className="score" style={{ color: "var(--yza-color-warning-600)" }}>{t("scoreboard.availability")}</th>
                </>
              ) : !isRedBlue ? (
                <>
                  <th className="score">{t("scoreboard.solveCount")}</th>
                  <th>{t("scoreboard.lastSolve")}</th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {data.teams.map((team) => (
              <tr key={team.team_id} className={team.rank <= 3 ? "scoreboard-top3" : ""}>
                <td className="rank">{team.rank <= 3 ? RANK_MEDAL[team.rank - 1] : team.rank}</td>
                <td className="team-name">{team.team_name}</td>
                {isRedBlue && (
                  <td style={{ textAlign: "center" }}>
                    <Tag tone={ROLE_TONE[team.team_role] ?? "neutral"}>{t(`role.${team.team_role}`)}</Tag>
                  </td>
                )}
                <td className="score">{team.total_score}</td>
                {isAWD ? (
                  <>
                    <td className="score" style={{ color: "var(--yza-color-success-600)" }}>+{team.awd_attack_score || 0}</td>
                    <td className="score" style={{ color: "var(--yza-color-danger-600)" }}>{team.awd_defense_score || 0}</td>
                    <td className="score" style={{ color: "var(--yza-color-warning-600)" }}>{team.awd_check_score || 0}</td>
                  </>
                ) : !isRedBlue ? (
                  <>
                    <td className="score">{team.solve_count}</td>
                    <td style={{ fontSize: 12, color: "var(--yza-text-muted)" }}>
                      {team.last_solve_at ? team.last_solve_at.replace("T", " ").slice(0, 19) : "—"}
                    </td>
                  </>
                ) : null}
              </tr>
            ))}
            {data.teams.length === 0 && (
              <tr><td colSpan={isAWD ? 6 : isRedBlue ? 4 : 5} className="portal-empty" style={{ border: "none" }}>{t("common.noData")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
