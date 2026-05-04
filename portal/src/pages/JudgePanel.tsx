import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Tag, Alert } from "@yza/ui";
import { ArrowLeft, Gavel, Shield, Swords, ChevronRight, CheckCircle, XCircle, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { useCompetition, useScoreboard } from "@/hooks/usePortal";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface Report {
  id: number;
  team_name: string;
  username: string;
  title: string;
  content: string;
  severity?: string;
  vuln_type?: string;
  target?: string;
  action_type?: string;
  threat_description?: string;
  att_ck_tactic?: string;
  att_ck_technique?: string;
  detected_techniques?: string[];
  related_attack_id?: number;
  status: string;
  score: number;
  judge_comment: string;
  submitted_at: string;
}

interface Phase {
  id: number;
  name: string;
  status: string;
  order_num: number;
  duration_minutes: number;
  started_at?: string;
  ended_at?: string;
}

const STATUS_TONE: Record<string, "warning" | "success" | "danger" | "neutral"> = {
  submitted: "warning", reviewing: "warning", accepted: "success", rejected: "danger",
};
const SEVERITY_TONE: Record<string, "neutral" | "info" | "warning" | "danger"> = {
  info: "neutral", low: "info", medium: "warning", high: "danger", critical: "danger",
};

type Tab = "attacks" | "defenses" | "phases";

export default function JudgePanel() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const compId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("attacks");
  const { data: comp } = useCompetition(compId);
  const teamRole = comp?.team_role ?? "";

  if (comp && teamRole !== "judge" && teamRole !== "white") {
    return (
      <div>
        <button onClick={() => navigate(`/competitions/${compId}`)} className="comp-back" type="button">
          <ArrowLeft size={16} /> {t("competition.backToComp")}
        </button>
        <Alert tone="danger" heading={t("redblue.permDenied")}>{t("redblue.judgeForbidden")}</Alert>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "attacks", label: t("redblue.attackReport"), icon: <Swords size={14} /> },
    { key: "defenses", label: t("redblue.defenseReport"), icon: <Shield size={14} /> },
    { key: "phases", label: t("redblue.phases"), icon: <ChevronRight size={14} /> },
  ];

  return (
    <div>
      <button onClick={() => navigate(`/competitions/${compId}`)} className="comp-back" type="button">
        <ArrowLeft size={16} /> {t("competition.backToComp")}
      </button>

      <div className="portal-page-header">
        <h1><Gavel size={20} /> {t("redblue.judgePanel")}</h1>
        <p>{t("redblue.judgeDesc")}</p>
      </div>

      <div className="judge-tabs">
        {tabs.map((item) => (
          <button
            key={item.key} type="button" onClick={() => setTab(item.key)}
            className={`judge-tab${tab === item.key ? " judge-tab--active" : ""}`}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      {tab === "attacks" && <ReportList compId={compId} type="attack" qc={qc} />}
      {tab === "defenses" && <ReportList compId={compId} type="defense" qc={qc} />}
      {tab === "phases" && <PhaseManager compId={compId} qc={qc} />}
    </div>
  );
}

function ReportList({ compId, type, qc }: { compId: number; type: "attack" | "defense"; qc: ReturnType<typeof useQueryClient> }) {
  const { t } = useTranslation();
  const endpoint = type === "attack" ? "attack-reports" : "defense-reports";
  const { data, isLoading } = useQuery({
    queryKey: ["judge", endpoint, compId],
    queryFn: () => api.get<{ items: Report[] }>(`/api/v1/portal/competitions/${compId}/${endpoint}`).then((r) => r.data),
    refetchInterval: 10_000,
  });

  const [judging, setJudging] = useState<Report | null>(null);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");

  const judgeMutation = useMutation({
    mutationFn: ({ reportId, status }: { reportId: number; status: string }) =>
      api.put(`/api/v1/portal/competitions/${compId}/${endpoint}/${reportId}/judge`, { status, score, comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["judge", endpoint, compId] });
      setJudging(null);
      setScore(0);
      setComment("");
      toast.success(t("redblue.judgeDone"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("redblue.judgeFailed")),
  });

  if (isLoading) return <div className="portal-empty">{t("common.loading")}</div>;
  const reports = data?.items ?? [];
  const pending = reports.filter((r) => r.status === "submitted" || r.status === "reviewing");
  const reviewed = reports.filter((r) => r.status === "accepted" || r.status === "rejected");

  return (
    <div>
      {/* 统计栏 */}
      <TeamScoreBar compId={compId} pendingCount={pending.length} reviewedCount={reviewed.length} />

      {pending.length > 0 && (
        <section className="portal-section">
          <div className="portal-section__title" style={{ color: "var(--yza-color-warning-600)" }}>
            {t("redblue.pendingReview")} ({pending.length})
          </div>
          <div className="report-list">
            {pending.map((r) => (
              <ReportCard key={r.id} report={r} type={type} onJudge={() => { setJudging(r); setScore(0); setComment(""); }} />
            ))}
          </div>
        </section>
      )}

      {reviewed.length > 0 && (
        <section className="portal-section">
          <div className="portal-section__title">{t("redblue.reviewed")} ({reviewed.length})</div>
          <div className="report-list">
            {reviewed.map((r) => <ReportCard key={r.id} report={r} type={type} />)}
          </div>
        </section>
      )}

      {reports.length === 0 && (
        <div className="portal-empty">
          {type === "attack" ? t("redblue.noAttackReports") : t("redblue.noDefenseReports")}
        </div>
      )}

      {/* 评审弹窗 */}
      {judging && (
        <div className="judge-modal-overlay" onClick={() => setJudging(null)}>
          <div className="judge-modal" onClick={(e) => e.stopPropagation()}>
            <div className="judge-modal__header">
              <Gavel size={16} />
              <span>{t("redblue.judge")}：{judging.title}</span>
            </div>

            <div className="judge-modal__meta">
              <MetaRow label={t("redblue.team")} value={`${judging.team_name} / ${judging.username}`} />
              {judging.severity && (
                <MetaRow label={t("redblue.severity")} value={
                  <Tag tone={SEVERITY_TONE[judging.severity] ?? "neutral"}>{t(`severity.${judging.severity}`)}</Tag>
                } />
              )}
              {judging.vuln_type && <MetaRow label={t("redblue.vulnType")} value={judging.vuln_type} />}
              {judging.target && <MetaRow label={t("redblue.target")} value={judging.target} />}
              {judging.att_ck_technique && <MetaRow label={t("redblue.attck")} value={
                <code style={{ fontSize: 12, background: "var(--yza-surface-raised)", padding: "1px 6px", borderRadius: 4 }}>{judging.att_ck_technique}</code>
              } />}
              {judging.action_type && (
                <MetaRow label={t("redblue.actionType")} value={
                  <Tag tone="info">{t(`redblue.action${judging.action_type.charAt(0).toUpperCase() + judging.action_type.slice(1)}`, judging.action_type)}</Tag>
                } />
              )}
              {judging.threat_description && <MetaRow label={t("redblue.threatDesc")} value={judging.threat_description} />}
            </div>

            <div className="judge-modal__content">
              {judging.content}
            </div>

            <div className="judge-modal__form">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>{t("redblue.judgeScore")}</label>
                <input type="number" value={score} onChange={(e) => setScore(Number(e.target.value))} min={0} max={1000}
                  className="rb-input" style={{ width: 90 }} />
              </div>
              <textarea
                className="rb-textarea"
                placeholder={t("redblue.judgeComment")}
                value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
              />
            </div>

            <div className="judge-modal__actions">
              <Button tone="outline" onClick={() => setJudging(null)}>{t("common.cancel")}</Button>
              <Button tone="danger" onClick={() => judgeMutation.mutate({ reportId: judging.id, status: "rejected" })} disabled={judgeMutation.isPending}>
                <XCircle size={14} /> {t("redblue.reject")}
              </Button>
              <Button tone="primary" onClick={() => judgeMutation.mutate({ reportId: judging.id, status: "accepted" })} disabled={judgeMutation.isPending}>
                <CheckCircle size={14} /> {t("redblue.accept")} (+{score})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="judge-meta-row">
      <span className="judge-meta-row__label">{label}</span>
      <span className="judge-meta-row__value">{value}</span>
    </div>
  );
}

function ReportCard({ report: r, type, onJudge }: { report: Report; type: "attack" | "defense"; onJudge?: () => void }) {
  const { t } = useTranslation();
  const isAttack = type === "attack";

  return (
    <div className="report-item" style={{ borderLeft: `3px solid var(--yza-color-${r.status === "accepted" ? "success" : r.status === "rejected" ? "danger" : "warning"}-500)` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isAttack ? <Swords size={14} style={{ color: "var(--yza-color-danger-500)" }} /> : <Shield size={14} style={{ color: "var(--yza-color-info-500)" }} />}
          <span style={{ fontWeight: 700, fontSize: 14 }}>{r.title}</span>
          <Tag tone={STATUS_TONE[r.status] ?? "neutral"}>{t(`status.${r.status}`)}</Tag>
          {r.score > 0 && <Tag tone="success">+{r.score}</Tag>}
        </div>
        {onJudge && (r.status === "submitted" || r.status === "reviewing") && (
          <Button size="sm" tone="primary" onClick={onJudge}><Gavel size={12} /> {t("redblue.judge")}</Button>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 12, color: "var(--yza-text-muted)", marginBottom: 6, alignItems: "center" }}>
        <span>{r.team_name} / {r.username}</span>
        <span>·</span>
        <span><Clock size={10} /> {r.submitted_at.replace("T", " ").slice(0, 19)}</span>
        {r.severity && <Tag tone={SEVERITY_TONE[r.severity] ?? "neutral"}>{t(`severity.${r.severity}`)}</Tag>}
        {r.action_type && <Tag tone="info">{t(`redblue.action${r.action_type.charAt(0).toUpperCase() + r.action_type.slice(1)}`, r.action_type)}</Tag>}
        {r.att_ck_technique && <code style={{ fontSize: 11, background: "var(--yza-surface-raised)", padding: "0 4px", borderRadius: 3 }}>{r.att_ck_technique}</code>}
      </div>

      <div style={{ fontSize: 13, color: "var(--yza-text-secondary)", lineHeight: 1.5 }}>
        {r.content.slice(0, 200)}{r.content.length > 200 ? "..." : ""}
      </div>

      {r.judge_comment && (
        <div className="report-item__judge">
          <Gavel size={11} /> {r.judge_comment}
        </div>
      )}
    </div>
  );
}

function PhaseManager({ compId, qc }: { compId: number; qc: ReturnType<typeof useQueryClient> }) {
  const { t } = useTranslation();
  const { data: phases, isLoading } = useQuery({
    queryKey: ["judge-phases", compId],
    queryFn: () => api.get<Phase[]>(`/api/v1/portal/competitions/${compId}/phases`).then((r) => r.data),
  });

  const [newName, setNewName] = useState("");
  const [newDuration, setNewDuration] = useState(60);

  const createMutation = useMutation({
    mutationFn: () => api.post(`/api/v1/portal/competitions/${compId}/phases`, {
      name: newName, description: "", order_num: (phases?.length ?? 0) + 1, duration_minutes: newDuration,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["judge-phases", compId] }); setNewName(""); toast.success(t("redblue.phaseCreated")); },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("common.createFailed")),
  });

  const advanceMutation = useMutation({
    mutationFn: () => api.post(`/api/v1/portal/competitions/${compId}/phases/advance`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["judge-phases", compId] }); toast.success(t("redblue.phaseAdvanced")); },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("redblue.phaseFailed")),
  });

  if (isLoading) return <div className="portal-empty">{t("common.loading")}</div>;

  const phaseList = phases ?? [];
  const activePhase = phaseList.find((p) => p.status === "active");

  const PHASE_TONE: Record<string, "success" | "neutral" | "warning"> = { active: "success", completed: "neutral", pending: "warning" };

  return (
    <div>
      {activePhase && (
        <Alert tone="info" heading={`${t("redblue.currentPhase")}：${activePhase.name}`}>
          {t("redblue.estimatedDuration")} {activePhase.duration_minutes} {t("redblue.minutes")} · {t("redblue.startedAt")} {activePhase.started_at?.replace("T", " ").slice(0, 19) ?? "—"}
        </Alert>
      )}

      <div className="yza-doc-card" style={{ padding: "var(--yza-space-5)", marginTop: "var(--yza-space-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--yza-space-4)" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t("redblue.phases")}</h3>
          <Button tone="primary" onClick={() => advanceMutation.mutate()} disabled={advanceMutation.isPending}>
            <ChevronRight size={14} /> {t("redblue.advancePhase")}
          </Button>
        </div>

        <div className="yza-doc-card" style={{ overflow: "auto", border: "none", boxShadow: "none" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--yza-border-default)", textAlign: "left" }}>
                <th style={{ padding: "8px 12px", width: 40 }}>#</th>
                <th style={{ padding: "8px 12px" }}>{t("table.name")}</th>
                <th style={{ padding: "8px 12px", width: 80, textAlign: "center" }}>{t("table.status")}</th>
                <th style={{ padding: "8px 12px", width: 70 }}>{t("redblue.minutes")}</th>
                <th style={{ padding: "8px 12px", width: 140 }}>{t("redblue.startedAt")}</th>
              </tr>
            </thead>
            <tbody>
              {phaseList.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--yza-border-subtle)", background: p.status === "active" ? "color-mix(in srgb, var(--yza-color-success-400) 5%, transparent)" : undefined }}>
                  <td style={{ padding: "8px 12px", color: "var(--yza-text-muted)" }}>{p.order_num}</td>
                  <td style={{ padding: "8px 12px", fontWeight: p.status === "active" ? 700 : 400 }}>{p.name}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>
                    <Tag tone={PHASE_TONE[p.status] ?? "neutral"}>{t(`status.${p.status}`)}</Tag>
                  </td>
                  <td style={{ padding: "8px 12px" }}>{p.duration_minutes}</td>
                  <td style={{ padding: "8px 12px", fontSize: 12, color: "var(--yza-text-muted)" }}>
                    {p.started_at?.replace("T", " ").slice(0, 19) ?? "—"}
                  </td>
                </tr>
              ))}
              {phaseList.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: "var(--yza-text-muted)" }}>{t("redblue.noPhases")}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ borderTop: "1px solid var(--yza-border-default)", paddingTop: "var(--yza-space-3)", marginTop: "var(--yza-space-3)", display: "flex", gap: 8, alignItems: "end" }}>
          <input className="rb-input" placeholder={t("redblue.phaseName")} value={newName} onChange={(e) => setNewName(e.target.value)} style={{ flex: 1 }} />
          <input className="rb-input" type="number" value={newDuration} onChange={(e) => setNewDuration(Number(e.target.value))} min={1} style={{ width: 80 }} />
          <span style={{ fontSize: 12, color: "var(--yza-text-muted)", whiteSpace: "nowrap" }}>{t("redblue.minutes")}</span>
          <Button tone="outline" onClick={() => createMutation.mutate()} disabled={!newName.trim() || createMutation.isPending}>{t("redblue.addPhase")}</Button>
        </div>
      </div>
    </div>
  );
}

const ROLE_TONE: Record<string, "danger" | "info" | "neutral"> = { red: "danger", blue: "info", participant: "neutral" };

function TeamScoreBar({ compId, pendingCount, reviewedCount }: { compId: number; pendingCount: number; reviewedCount: number }) {
  const { t } = useTranslation();
  const { data: scoreboard } = useScoreboard(compId);
  const teams = scoreboard?.teams ?? [];

  return (
    <div style={{ marginBottom: "var(--yza-space-5)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--yza-space-3)", marginBottom: "var(--yza-space-3)" }}>
        <div className="yza-doc-card" style={{ padding: "var(--yza-space-4)", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "var(--yza-text-muted)" }}>{t("redblue.pendingReview")}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--yza-color-warning-600)" }}>{pendingCount}</div>
        </div>
        <div className="yza-doc-card" style={{ padding: "var(--yza-space-4)", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "var(--yza-text-muted)" }}>{t("redblue.reviewed")}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--yza-color-success-600)" }}>{reviewedCount}</div>
        </div>
      </div>
      {teams.length > 0 && (
        <div className="yza-doc-card" style={{ padding: "var(--yza-space-4)" }}>
          <div style={{ fontSize: 12, color: "var(--yza-text-muted)", marginBottom: 8 }}>{t("scoreboard.title")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {teams.map((tm) => (
              <div key={tm.team_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>#{tm.rank}</span>
                  <span>{tm.team_name}</span>
                  {tm.team_role && <Tag tone={ROLE_TONE[tm.team_role] ?? "neutral"}>{t(`role.${tm.team_role}`)}</Tag>}
                </div>
                <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{tm.total_score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
