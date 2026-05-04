import { useState } from "react";
import { Button, Input, Tag } from "@yza/ui";
import { useMyTeam, useCreateTeam, useJoinTeam, useLeaveTeam } from "@/hooks/usePortal";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Users, Copy, Crown, UserPlus, LogOut, Trophy, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface CompEntry {
  competition_id: number; title: string; mode: string; status: string;
  team_role: string; start_time: string; end_time: string;
}

const MODE_TONE: Record<string, "info" | "danger" | "warning"> = { ctf_jeopardy: "info", awd: "danger", red_blue: "warning" };

export default function TeamManagement() {
  const { t } = useTranslation();
  const { data: team, isLoading, error } = useMyTeam();
  const createMutation = useCreateTeam();
  const joinMutation = useJoinTeam();
  const leaveMutation = useLeaveTeam();

  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const hasTeam = !error && team;

  const { data: comps } = useQuery({
    queryKey: ["my-team-competitions"],
    queryFn: () => api.get<CompEntry[]>("/api/v1/portal/teams/my/competitions").then((r) => r.data),
    enabled: !!hasTeam,
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({ name: teamName, description: teamDesc });
      toast.success(t("team.createSuccess"));
    } catch (err) { toast.error(err instanceof Error ? err.message : t("common.createFailed")); }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    try {
      await joinMutation.mutateAsync(inviteCode);
      toast.success(t("team.joinSuccess"));
    } catch (err) { toast.error(err instanceof Error ? err.message : t("common.operationFailed")); }
  }

  function copyInvite() {
    if (team?.invite_code) {
      navigator.clipboard.writeText(team.invite_code);
      toast.success(t("common.copied"));
    }
  }

  if (isLoading) return <div className="portal-empty">{t("common.loading")}</div>;

  if (hasTeam) {
    const members = team.members ?? [];
    const activeComps = (comps ?? []).filter((c) => c.status === "running");

    return (
      <div>
        <div className="portal-page-header"><h1><Users size={20} /> {t("team.myTeam")}</h1></div>

        {/* 战队信息 + 统计 */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--yza-space-4)", marginBottom: "var(--yza-space-5)" }}>
          <div className="yza-doc-card" style={{ padding: "var(--yza-space-5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--yza-space-3)" }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.02em" }}>{team.name}</h2>
                {team.description && <p style={{ fontSize: 13, color: "var(--yza-text-secondary)", margin: 0 }}>{team.description}</p>}
              </div>
              <Tag tone="success">{members.length} {t("team.memberCount")}</Tag>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--yza-surface-raised)", borderRadius: "var(--yza-radius-md)", marginBottom: "var(--yza-space-4)" }}>
              <span style={{ fontSize: 12, color: "var(--yza-text-muted)" }}>{t("team.inviteCode")}</span>
              <code style={{ flex: 1, fontSize: 14, fontFamily: "var(--yza-font-mono)", fontWeight: 600 }}>{team.invite_code}</code>
              <button onClick={copyInvite} type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--yza-text-secondary)", padding: 4 }}>
                <Copy size={14} />
              </button>
            </div>

            <div style={{ fontSize: 12, color: "var(--yza-text-muted)", marginBottom: 6 }}>{t("team.createdAt")} {team.created_at?.replace("T", " ").slice(0, 10)}</div>
          </div>

          {/* 统计 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--yza-space-3)" }}>
            <div className="yza-doc-card" style={{ padding: "var(--yza-space-4)", textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--yza-text-muted)", marginBottom: 2 }}><Trophy size={12} /> {t("team.compCount")}</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{comps?.length ?? 0}</div>
            </div>
            <div className="yza-doc-card" style={{ padding: "var(--yza-space-4)", textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--yza-text-muted)", marginBottom: 2 }}><Clock size={12} /> {t("team.activeCount")}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--yza-color-success-600)" }}>{activeComps.length}</div>
            </div>
          </div>
        </div>

        {/* 成员列表 */}
        <div style={{ marginBottom: "var(--yza-space-5)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: "var(--yza-space-3)" }}>{t("team.members")}</h3>
          <div className="yza-doc-card" style={{ overflow: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--yza-border-default)", textAlign: "left" }}>
                  <th style={{ padding: "8px 12px" }}>{t("auth.username")}</th>
                  <th style={{ padding: "8px 12px", width: 80 }}>{t("table.role")}</th>
                  <th style={{ padding: "8px 12px", width: 140 }}>{t("team.joinedAt")}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid var(--yza-border-subtle)" }}>
                    <td style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--yza-surface-raised)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--yza-text-secondary)" }}>
                        {m.username.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600 }}>{m.username}</span>
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      {m.role === "captain" ? (
                        <Tag tone="warning"><Crown size={10} /> {t("role.captain")}</Tag>
                      ) : (
                        <Tag tone="neutral">{t("role.member")}</Tag>
                      )}
                    </td>
                    <td style={{ padding: "8px 12px", fontSize: 12, color: "var(--yza-text-muted)" }}>
                      {m.joined_at?.replace("T", " ").slice(0, 16)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 参赛记录 */}
        {comps && comps.length > 0 && (
          <div style={{ marginBottom: "var(--yza-space-5)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: "var(--yza-space-3)" }}>{t("team.competitions")}</h3>
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
                      <td style={{ padding: "8px 12px" }}><Tag tone={MODE_TONE[c.mode] ?? "neutral"}>{t(`mode.${c.mode}`)}</Tag></td>
                      <td style={{ padding: "8px 12px" }}>
                        <Tag tone={c.team_role === "red" ? "danger" : c.team_role === "blue" ? "info" : "neutral"}>
                          {t(`role.${c.team_role}`)}
                        </Tag>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <Tag tone={c.status === "running" ? "success" : "neutral"}>{t(`status.${c.status}`)}</Tag>
                      </td>
                      <td style={{ padding: "8px 12px", fontSize: 12, color: "var(--yza-text-muted)" }}>
                        {c.start_time ? c.start_time.slice(0, 10) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 退出按钮 */}
        <Button tone="danger" size="sm" onClick={() => { void leaveMutation.mutateAsync().then(() => toast.success(t("team.leaveSuccess"))).catch(() => toast.error(t("team.leaveFailed"))); }} disabled={leaveMutation.isPending}>
          <LogOut size={12} /> {t("team.leave")}
        </Button>
      </div>
    );
  }

  // 未组队状态
  return (
    <div>
      <div className="portal-page-header">
        <h1><UserPlus size={20} /> {t("team.joinTeam")}</h1>
        <p>{t("team.joinOrCreate")}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--yza-space-4)" }}>
        {/* 创建战队 */}
        <div className="yza-doc-card" style={{ padding: "var(--yza-space-5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--yza-space-4)" }}>
            <div style={{ width: 36, height: 36, borderRadius: "var(--yza-radius-md)", background: "color-mix(in srgb, var(--yza-color-brand-500) 10%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={18} style={{ color: "var(--yza-color-brand-600)" }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{t("team.createTeam")}</div>
              <div style={{ fontSize: 12, color: "var(--yza-text-muted)" }}>{t("team.createDesc")}</div>
            </div>
          </div>
          <form onSubmit={handleCreate} className="yza-doc-stack">
            <Input label={t("team.teamName")} value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder={t("team.teamNamePlaceholder")} />
            <Input label={t("team.teamDesc")} value={teamDesc} onChange={(e) => setTeamDesc(e.target.value)} placeholder={t("team.teamDescPlaceholder")} />
            <Button tone="primary" type="submit" disabled={!teamName.trim() || createMutation.isPending} style={{ width: "100%" }}>
              {createMutation.isPending ? t("team.creating") : t("team.createTeam")}
            </Button>
          </form>
        </div>

        {/* 加入战队 */}
        <div className="yza-doc-card" style={{ padding: "var(--yza-space-5)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--yza-space-4)" }}>
            <div style={{ width: 36, height: 36, borderRadius: "var(--yza-radius-md)", background: "color-mix(in srgb, var(--yza-color-success-500) 10%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UserPlus size={18} style={{ color: "var(--yza-color-success-600)" }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{t("team.joinTeam")}</div>
              <div style={{ fontSize: 12, color: "var(--yza-text-muted)" }}>{t("team.joinDesc")}</div>
            </div>
          </div>
          <form onSubmit={handleJoin} className="yza-doc-stack" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <Input label={t("team.inviteCode")} value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder={t("team.inviteCodePlaceholder")} />
            <div style={{ flex: 1 }} />
            <Button tone="primary" type="submit" disabled={!inviteCode.trim() || joinMutation.isPending} style={{ width: "100%" }}>
              {joinMutation.isPending ? t("common.loading") : t("team.join")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
