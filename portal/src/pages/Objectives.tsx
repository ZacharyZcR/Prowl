import { useParams, useNavigate } from "react-router-dom";
import { Tag, Alert } from "@yza/ui";
import { ArrowLeft, Target, ExternalLink } from "lucide-react";
import { useObjectives, useCompetition, useScoreboard, useMyTeam } from "@/hooks/usePortal";
import { useTranslation } from "react-i18next";

export default function Objectives() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const compId = Number(id);
  const navigate = useNavigate();
  const { data: comp } = useCompetition(compId);
  const { data: myTeam } = useMyTeam();
  const { data: scoreboard } = useScoreboard(compId);
  const teamRole = comp?.team_role;
  const { data: objectives, isLoading, error } = useObjectives(compId, undefined, myTeam?.id);

  if (isLoading) return <div className="portal-empty">{t("common.loading")}</div>;
  if (error) return <Alert tone="danger" heading={t("common.loadFailed")} />;

  const items = objectives ?? [];
  const redItems = items.filter((o) => o.team_role === "red" || o.team_role === "all");
  const blueItems = items.filter((o) => o.team_role === "blue" || o.team_role === "all");

  const myTeamEntry = scoreboard?.teams?.find((t) => {
    if (!teamRole) return false;
    return t.team_role === teamRole;
  });

  const totalReports = items.reduce((s, o) => s + (o.report_count ?? 0), 0);
  const showRed = !teamRole || teamRole === "red" || teamRole === "judge" || teamRole === "white" || teamRole === "participant";
  const showBlue = !teamRole || teamRole === "blue" || teamRole === "judge" || teamRole === "white" || teamRole === "participant";

  return (
    <div>
      <button onClick={() => navigate(`/competitions/${compId}`)} className="comp-back" type="button">
        <ArrowLeft size={16} /> {t("competition.backToComp")}
      </button>

      <div className="portal-page-header">
        <h1><Target size={22} /> {t("objective.title")}</h1>
      </div>

      <div style={{ display: "flex", gap: "var(--yza-space-4)", marginBottom: "var(--yza-space-6)" }}>
        {myTeamEntry && (
          <div className="yza-doc-card" style={{ flex: 1, padding: "var(--yza-space-5)", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "var(--yza-text-muted)", marginBottom: 4 }}>{t("objective.teamScore")}</div>
            <div style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{myTeamEntry.total_score}</div>
          </div>
        )}
        <div className="yza-doc-card" style={{ flex: 1, padding: "var(--yza-space-5)", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "var(--yza-text-muted)", marginBottom: 4 }}>{t("objective.submittedReports")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{totalReports}</div>
        </div>
        <div className="yza-doc-card" style={{ flex: 1, padding: "var(--yza-space-5)", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "var(--yza-text-muted)", marginBottom: 4 }}>{t("objective.totalObjectives")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
            {teamRole === "red" ? redItems.length : teamRole === "blue" ? blueItems.length : Math.max(redItems.length, blueItems.length)}
          </div>
        </div>
      </div>

      {showRed && redItems.length > 0 && (
        <section style={{ marginBottom: "var(--yza-space-6)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 var(--yza-space-3)", display: "flex", alignItems: "center", gap: 8 }}>
            <Tag tone="danger">{t("role.red")}</Tag> {t("objective.redAttack")}
          </h2>
          <ObjectiveTable items={redItems} />
        </section>
      )}

      {showBlue && blueItems.length > 0 && (
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 var(--yza-space-3)", display: "flex", alignItems: "center", gap: 8 }}>
            <Tag tone="info">{t("role.blue")}</Tag> {t("objective.blueDefense")}
          </h2>
          <ObjectiveTable items={blueItems} />
        </section>
      )}

      {items.length === 0 && <div className="portal-empty">{t("objective.noObjectives")}</div>}
    </div>
  );
}

interface ObjItem {
  id: number;
  title: string;
  target_url?: string;
  description: string;
  team_role: string;
  points: number;
  order_num: number;
  status: string;
  report_count?: number;
}

function ObjectiveTable({ items }: { items: ObjItem[] }) {
  const { t } = useTranslation();
  const sorted = [...items].sort((a, b) => a.order_num - b.order_num);
  return (
    <div className="yza-doc-card" style={{ overflow: "auto" }}>
      <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--yza-border-default)", textAlign: "left" }}>
            <th style={{ padding: "10px 12px", width: 40 }}>#</th>
            <th style={{ padding: "10px 12px" }}>{t("objective.title")}</th>
            <th style={{ padding: "10px 12px" }}>{t("objective.url")}</th>
            <th style={{ padding: "10px 12px", width: 80, textAlign: "center" }}>{t("objective.reports")}</th>
            <th style={{ padding: "10px 12px", width: 70, textAlign: "right" }}>{t("objective.score")}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((o, i) => {
            const count = o.report_count ?? 0;
            const scored = o.status === "completed";
            return (
              <tr key={o.id} style={{ borderBottom: "1px solid var(--yza-border-subtle)" }}>
                <td style={{ padding: "10px 12px", fontVariantNumeric: "tabular-nums", color: "var(--yza-text-muted)" }}>
                  {o.order_num || i + 1}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ fontWeight: 600, marginBottom: o.description ? 2 : 0 }}>{o.title}</div>
                  {o.description && (
                    <div style={{ fontSize: 12, color: "var(--yza-text-muted)", lineHeight: 1.5 }}>{o.description}</div>
                  )}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  {o.target_url ? (
                    <code style={{ fontSize: 12, background: "var(--yza-surface-raised)", padding: "2px 6px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {o.target_url} <ExternalLink size={10} />
                    </code>
                  ) : (
                    <span style={{ color: "var(--yza-text-muted)", fontSize: 12 }}>—</span>
                  )}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  {count > 0 ? (
                    <Tag tone="success">{t("objective.reportsCount", { count })}</Tag>
                  ) : (
                    <Tag tone="neutral">{t("objective.noReports")}</Tag>
                  )}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {scored ? o.points : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
