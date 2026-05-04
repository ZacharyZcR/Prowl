import { useAuthStore } from "@/stores/auth";
import { useMyTeam } from "@/hooks/usePortal";
import { useQuery } from "@tanstack/react-query";
import { Tag } from "@yza/ui";
import { User, Shield, Mail, Clock, Trophy, Swords } from "lucide-react";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface CompEntry {
  competition_id: number;
  title: string;
  mode: string;
  status: string;
  team_role: string;
  reg_status: string;
  start_time: string;
  end_time: string;
  registered_at: string;
}

const MODE_TONE: Record<string, "info" | "danger" | "warning"> = { ctf_jeopardy: "info", awd: "danger", red_blue: "warning" };

export default function Profile() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: team } = useMyTeam();
  const { data: comps } = useQuery({
    queryKey: ["my-competitions"],
    queryFn: () => api.get<CompEntry[]>("/api/v1/portal/teams/my/competitions").then((r) => r.data),
    retry: false,
  });

  if (!user) return <div className="portal-empty">未登录</div>;

  const activeComps = (comps ?? []).filter((c) => c.status === "running");
  const historyComps = (comps ?? []).filter((c) => c.status !== "running");

  return (
    <div>
      <div className="portal-page-header"><h1><User size={20} /> {t("profile.title")}</h1></div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--yza-space-4)", marginBottom: "var(--yza-space-5)" }}>
        {/* 个人信息 */}
        <div className="yza-doc-card" style={{ padding: "var(--yza-space-5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--yza-space-4)", marginBottom: "var(--yza-space-4)" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--yza-color-brand-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "var(--yza-color-brand-600)" }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{user.nickname || user.username}</div>
              <div style={{ fontSize: 12, color: "var(--yza-text-muted)" }}>@{user.username}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--yza-text-secondary)" }}>
              <Mail size={14} /> {user.email || t("common.notSet")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--yza-text-secondary)" }}>
              <Shield size={14} /> {t("profile.role")}：{user.role?.description || user.role?.name || t("role.participant")}
            </div>
          </div>
        </div>

        {/* 战队摘要 */}
        <div className="yza-doc-card" style={{ padding: "var(--yza-space-5)" }}>
          {team ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--yza-space-3)" }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{team.name}</div>
                <Tag tone="success">已组队</Tag>
              </div>
              <div style={{ fontSize: 13, color: "var(--yza-text-secondary)", marginBottom: "var(--yza-space-3)" }}>
                {team.description || t("common.noDescription")}
              </div>
              <div style={{ display: "flex", gap: "var(--yza-space-4)", fontSize: 13 }}>
                <span><strong>{team.members?.length ?? 0}</strong> {t("team.memberCount")}</span>
                <span>队长：<strong>{team.captain_name}</strong></span>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "var(--yza-space-4)", color: "var(--yza-text-muted)" }}>
              {t("profile.notInTeam")}
              <div style={{ marginTop: 8 }}><Link to="/team" style={{ color: "var(--yza-color-brand-500)", fontWeight: 600 }}>{t("profile.goTeam")}</Link></div>
            </div>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--yza-space-4)", marginBottom: "var(--yza-space-5)" }}>
        <StatCard icon={<Trophy size={16} />} label={t("profile.compCount")} value={String(comps?.length ?? 0)} />
        <StatCard icon={<Swords size={16} />} label={t("profile.activeComps")} value={String(activeComps.length)} tone="success" />
        <StatCard icon={<Clock size={16} />} label={t("profile.endedComps")} value={String(historyComps.length)} />
      </div>

      {/* 参赛历史 */}
      {comps && comps.length > 0 && (
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: "var(--yza-space-3)" }}>{t("profile.compHistory")}</h2>
          <div className="yza-doc-card" style={{ overflow: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--yza-border-default)", textAlign: "left" }}>
                  <th style={{ padding: "8px 12px" }}>比赛</th>
                  <th style={{ padding: "8px 12px", width: 60 }}>{t("table.mode")}</th>
                  <th style={{ padding: "8px 12px", width: 60 }}>{t("table.role")}</th>
                  <th style={{ padding: "8px 12px", width: 70 }}>{t("table.status")}</th>
                  <th style={{ padding: "8px 12px", width: 140 }}>{t("table.time")}</th>
                </tr>
              </thead>
              <tbody>
                {comps.map((c) => (
                  <tr key={c.competition_id} style={{ borderBottom: "1px solid var(--yza-border-subtle)" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                      <Link to={`/competitions/${c.competition_id}`} style={{ color: "inherit", textDecoration: "none" }}>{c.title}</Link>
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <Tag tone={MODE_TONE[c.mode] ?? "neutral"}>{t(`mode.${c.mode}`)}</Tag>
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <Tag tone={c.team_role === "red" ? "danger" : c.team_role === "blue" ? "info" : "neutral"}>
                        {t(`role.${c.team_role}`)}
                      </Tag>
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <Tag tone={c.status === "running" ? "success" : "neutral"}>{t(`status.${c.status}`)}</Tag>
                    </td>
                    <td style={{ padding: "8px 12px", fontSize: 12, color: "var(--yza-text-muted)" }}>
                      {c.start_time ? c.start_time.slice(0, 10) : "—"} ~ {c.end_time ? c.end_time.slice(0, 10) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: string }) {
  return (
    <div className="yza-doc-card" style={{ padding: "var(--yza-space-4)", textAlign: "center" }}>
      <div style={{ color: "var(--yza-text-muted)", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12 }}>{icon} {label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: tone === "success" ? "var(--yza-color-success-600)" : undefined }}>{value}</div>
    </div>
  );
}
