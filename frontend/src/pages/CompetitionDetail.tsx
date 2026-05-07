import { type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity, ClipboardList, FileText, Flag, Gavel, ListChecks, Radar, Shield, Swords, Trophy } from "lucide-react";
import { Alert, Button, DataTable, Skeleton, Tag } from "@yza/ui";
import { api } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { formatDate } from "@/lib/datetime";
import {
  useAdminWriteups,
  useAntiCheatReport,
  useCompetition,
  useCompetitionRegistrations,
  useCompetitionSubmissions,
  type TeamRegistration,
} from "@/hooks/useCompetitions";

type TagTone = "info" | "success" | "warning" | "neutral" | "danger";

interface Scoreboard {
  teams: Array<{ rank: number; team_id: number; team_name: string; team_role?: string; total_score: number; solve_count: number }>;
}

interface Round {
  id: number;
  round_number: number;
  status: string;
  started_at: string;
}

interface Phase {
  id: number;
  name: string;
  status: string;
  order_num: number;
}

interface ReportList {
  items: Array<{ id: number; title: string; status: string; score: number; team_name: string; submitted_at: string }>;
}

interface RedBlueSummary {
  total_attack_reports: number;
  accepted_attacks: number;
  total_defense_reports: number;
  accepted_defenses: number;
  phase_stats: Array<{ phase_id: number; phase_name: string; attack_count: number; defense_count: number; total_score: number }>;
}

interface Row extends Record<string, ReactNode> {
  name: ReactNode;
  status: ReactNode;
  extra: ReactNode;
  time: ReactNode;
}

const MODE_LABEL: Record<string, string> = { ctf_jeopardy: "CTF", awd: "AWD", red_blue: "红蓝对抗" };
const MODE_TONE: Record<string, TagTone> = { ctf_jeopardy: "info", awd: "danger", red_blue: "warning" };
const STATUS_TONE: Record<string, TagTone> = {
  draft: "neutral",
  registration: "info",
  running: "success",
  paused: "warning",
  ended: "danger",
  archived: "neutral",
  approved: "success",
  pending: "warning",
  rejected: "danger",
  submitted: "warning",
  reviewed: "info",
  accepted: "success",
  completed: "success",
  active: "success",
};

function useScoreboard(compId: number) {
  return useQuery({
    queryKey: ["competitions", compId, "scoreboard"],
    queryFn: () => api.get<Scoreboard>(`/api/v1/competitions/${compId}/scoreboard`).then((r) => r.data),
    enabled: compId > 0,
  });
}

function useAWDRounds(compId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["awd-rounds", compId],
    queryFn: () => api.get<Round[]>(`/api/v1/competitions/${compId}/rounds`).then((r) => r.data),
    enabled: compId > 0 && enabled,
  });
}

function useRedBluePhases(compId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["rb-phases-admin", compId],
    queryFn: () => api.get<Phase[]>(`/api/v1/competitions/${compId}/phases`).then((r) => r.data),
    enabled: compId > 0 && enabled,
  });
}

function useRedBlueReports(compId: number, kind: "attack-reports" | "defense-reports", enabled: boolean) {
  return useQuery({
    queryKey: ["rb-reports-admin", compId, kind],
    queryFn: () => api.get<ReportList>(`/api/v1/competitions/${compId}/${kind}`, { params: { page_size: 100 } }).then((r) => r.data),
    enabled: compId > 0 && enabled,
  });
}

function useRedBlueSummary(compId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["rb-summary-admin", compId],
    queryFn: () => api.get<RedBlueSummary>(`/api/v1/portal/competitions/${compId}/exercise-summary`).then((r) => r.data),
    enabled: compId > 0 && enabled,
  });
}

export default function CompetitionDetail() {
  const { id } = useParams<{ id: string }>();
  const compId = Number(id);
  const navigate = useNavigate();
  const competitionQuery = useCompetition(compId);
  const comp = competitionQuery.data;
  const registrationsQuery = useCompetitionRegistrations(compId);
  const submissionsQuery = useCompetitionSubmissions(compId);
  const writeupsQuery = useAdminWriteups(compId);
  const auditQuery = useAntiCheatReport(compId);
  const scoreboardQuery = useScoreboard(compId);
  const isAWD = comp?.mode === "awd";
  const isRedBlue = comp?.mode === "red_blue";
  const awdRoundsQuery = useAWDRounds(compId, isAWD);
  const phasesQuery = useRedBluePhases(compId, isRedBlue);
  const attacksQuery = useRedBlueReports(compId, "attack-reports", isRedBlue);
  const defensesQuery = useRedBlueReports(compId, "defense-reports", isRedBlue);
  const rbSummaryQuery = useRedBlueSummary(compId, isRedBlue);

  if (competitionQuery.isLoading) {
    return (
      <PageShell title="赛事详情" description="加载赛事总览">
        <Skeleton variant="rect" height={120} />
        <Skeleton count={4} variant="rect" height={88} />
      </PageShell>
    );
  }

  if (!comp) {
    return (
      <PageShell title="赛事详情" description="无法读取赛事">
        <Alert tone="danger" heading="加载失败" description={competitionQuery.error instanceof Error ? competitionQuery.error.message : "赛事不存在或无权限访问"} />
      </PageShell>
    );
  }

  const registrations = registrationsQuery.data ?? [];
  const submissions = submissionsQuery.data?.items ?? [];
  const writeups = writeupsQuery.data?.items ?? [];
  const scoreboard = scoreboardQuery.data?.teams ?? [];
  const audit = auditQuery.data;
  const pendingRegs = registrations.filter((r) => r.status === "pending").length;
  const pendingWriteups = writeups.filter((w) => w.status === "submitted").length;
  const correctSubmits = submissions.filter((s) => s.is_correct).length;
  const wrongSubmits = submissions.length - correctSubmits;
  const topTeam = scoreboard[0];
  const awdRounds = awdRoundsQuery.data ?? [];
  const phases = phasesQuery.data ?? [];
  const attacks = attacksQuery.data?.items ?? [];
  const defenses = defensesQuery.data?.items ?? [];
  const rbSummary = rbSummaryQuery.data;
  const auditAlerts = (audit?.cross_flag_alerts?.length ?? 0) + (audit?.ip_correlations?.length ?? 0) + (audit?.rapid_submissions?.length ?? 0) + (audit?.awd_audit?.suspicious_submissions?.length ?? 0);

  const controlPath = comp.mode === "awd" ? `/competitions/${comp.id}/awd` : comp.mode === "red_blue" ? `/competitions/${comp.id}/redblue` : `/competitions/${comp.id}/challenges`;
  const controlLabel = comp.mode === "awd" ? "AWD 控制" : comp.mode === "red_blue" ? "红蓝控制" : "题目管理";

  return (
    <PageShell
      title={comp.title}
      description={comp.description || "赛事后台总览"}
      meta={<div className="stc-tag-list"><Tag tone={MODE_TONE[comp.mode] ?? "neutral"}>{MODE_LABEL[comp.mode] ?? comp.mode}</Tag><Tag tone={STATUS_TONE[comp.status] ?? "neutral"}>{comp.status}</Tag></div>}
      actions={
        <div className="yza-button-row">
          <Button tone="outline" onClick={() => navigate(-1)}>返回</Button>
          <Button tone="primary" onClick={() => navigate(controlPath)}><ListChecks size={14} /> {controlLabel}</Button>
          <Button tone="outline" onClick={() => navigate(`/competitions/${comp.id}/audit`)}><Shield size={14} /> 审计</Button>
        </div>
      }
    >
      <section className="yza-doc-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          <Metric icon={<Trophy size={16} />} label="战队" value={comp.team_count} />
          <Metric icon={<Flag size={16} />} label="题目" value={comp.challenge_count} />
          <Metric icon={<ClipboardList size={16} />} label="提交" value={submissions.length} meta={`${correctSubmits} 正确 / ${wrongSubmits} 错误`} />
          <Metric icon={<FileText size={16} />} label="WriteUp" value={writeups.length} meta={`${pendingWriteups} 待审`} />
          <Metric icon={<Radar size={16} />} label="审计信号" value={auditAlerts} />
          <Metric icon={<Activity size={16} />} label="榜首" value={topTeam ? topTeam.total_score : "—"} meta={topTeam?.team_name ?? "暂无"} />
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 0.8fr)", gap: 16, alignItems: "start" }}>
        <div className="yza-doc-stack">
          <InfoCard title="基础信息" icon={<Trophy size={16} />}>
            <InfoGrid items={[
              ["开始时间", comp.start_time ? formatDate(comp.start_time) : "—"],
              ["结束时间", comp.end_time ? formatDate(comp.end_time) : "—"],
              ["报名开始", comp.registration_start ? formatDate(comp.registration_start) : "—"],
              ["报名结束", comp.registration_end ? formatDate(comp.registration_end) : "—"],
              ["最大队伍", String(comp.max_teams || "不限")],
              ["队伍人数", String(comp.max_team_size || "不限")],
              ["公开赛事", comp.is_public ? "是" : "否"],
              ["创建人", comp.creator_name || `#${comp.created_by}`],
            ]} />
          </InfoCard>

          {isAWD && (
            <InfoCard title="AWD 运行概况" icon={<Swords size={16} />}>
              <InfoGrid items={[
                ["轮次", String(awdRounds.length)],
                ["最近轮次", awdRounds[0] ? `#${awdRounds[0].round_number} ${awdRounds[0].status}` : "暂无"],
                ["攻击记录", String(audit?.awd_audit?.attack_edges?.length ?? 0)],
                ["服务异常", String(audit?.awd_audit?.service_incidents?.length ?? 0)],
              ]} />
            </InfoCard>
          )}

          {isRedBlue && (
            <InfoCard title="红蓝对抗概况" icon={<Gavel size={16} />}>
              <InfoGrid items={[
                ["阶段", `${phases.filter((p) => p.status === "completed").length}/${phases.length} 已完成`],
                ["攻击报告", `${rbSummary?.accepted_attacks ?? attacks.filter((r) => r.status === "accepted").length}/${rbSummary?.total_attack_reports ?? attacks.length} 通过`],
                ["防守报告", `${rbSummary?.accepted_defenses ?? defenses.filter((r) => r.status === "accepted").length}/${rbSummary?.total_defense_reports ?? defenses.length} 通过`],
                ["当前阶段", phases.find((p) => p.status === "active")?.name ?? "无"],
              ]} />
              {rbSummary?.phase_stats?.length ? <PhaseStrip phases={rbSummary.phase_stats} /> : null}
            </InfoCard>
          )}

          <RegistrationTable registrations={registrations.slice(0, 8)} pending={pendingRegs} />
        </div>

        <div className="yza-doc-stack">
          <RankingCard teams={scoreboard.slice(0, 5)} />
          <RecentSubmissions rows={submissions.slice(0, 6)} />
          <RecentWriteups rows={writeups.slice(0, 5)} />
        </div>
      </div>
    </PageShell>
  );
}

function Metric({ icon, label, value, meta }: { icon: ReactNode; label: string; value: ReactNode; meta?: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
      <span style={{ color: "var(--yza-text-muted)", display: "inline-flex" }}>{icon}</span>
      <span style={{ minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, color: "var(--yza-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}{meta ? ` · ${meta}` : ""}</div>
      </span>
    </div>
  );
}

function InfoCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="yza-doc-card" style={{ padding: 16 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 750, display: "flex", alignItems: "center", gap: 8 }}>{icon}{title}</h3>
      {children}
    </section>
  );
}

function InfoGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
      {items.map(([label, value]) => <KeyValue key={label} label={label} value={value} />)}
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--yza-text-muted)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 650, overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

function PhaseStrip({ phases }: { phases: RedBlueSummary["phase_stats"] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginTop: 14 }}>
      {phases.map((p) => (
        <div key={p.phase_id} style={{ border: "1px solid var(--yza-border-subtle)", borderRadius: 6, padding: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{p.phase_name}</div>
          <div style={{ fontSize: 12, color: "var(--yza-text-muted)" }}>{p.attack_count} 攻击 / {p.defense_count} 防守 / {p.total_score} 分</div>
        </div>
      ))}
    </div>
  );
}

function RegistrationTable({ registrations, pending }: { registrations: TeamRegistration[]; pending: number }) {
  const rows: Row[] = registrations.map((r) => ({
    name: r.team_name,
    status: <Tag tone={STATUS_TONE[r.status] ?? "neutral"}>{r.status}</Tag>,
    extra: r.team_role || "participant",
    time: r.registered_at ? formatDate(r.registered_at) : "—",
  }));
  return (
    <InfoCard title={`报名队伍${pending > 0 ? ` · ${pending} 待审` : ""}`} icon={<Trophy size={16} />}>
      {rows.length ? <DataTable<Row> columns={smallColumns("队伍", "状态", "角色", "报名时间")} rows={rows} /> : <EmptyLine text="暂无报名队伍" />}
    </InfoCard>
  );
}

function RankingCard({ teams }: { teams: Scoreboard["teams"] }) {
  return (
    <InfoCard title="排行榜" icon={<Trophy size={16} />}>
      {teams.length ? (
        <div className="yza-doc-stack">
          {teams.map((team) => (
            <Link key={team.team_id} to="/teams" style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "inherit", textDecoration: "none", borderBottom: "1px solid var(--yza-border-subtle)", paddingBottom: 8 }}>
              <span style={{ minWidth: 0 }}><b>#{team.rank}</b> {team.team_name}</span>
              <span style={{ fontWeight: 800 }}>{team.total_score}</span>
            </Link>
          ))}
        </div>
      ) : <EmptyLine text="暂无排名" />}
    </InfoCard>
  );
}

function RecentSubmissions({ rows }: { rows: Array<{ id: number; team_name: string; challenge_name: string; is_correct: boolean; submitted_at: string }> }) {
  return (
    <InfoCard title="最近提交" icon={<ClipboardList size={16} />}>
      {rows.length ? rows.map((s) => (
        <TinyItem key={s.id} title={`${s.team_name} / ${s.challenge_name}`} meta={formatDate(s.submitted_at)} tag={<Tag tone={s.is_correct ? "success" : "danger"}>{s.is_correct ? "正确" : "错误"}</Tag>} />
      )) : <EmptyLine text="暂无提交" />}
    </InfoCard>
  );
}

function RecentWriteups({ rows }: { rows: Array<{ id: number; team_name: string; challenge_name: string; status: string; submitted_at: string }> }) {
  return (
    <InfoCard title="WriteUp" icon={<FileText size={16} />}>
      {rows.length ? rows.map((w) => (
        <TinyItem key={w.id} title={`${w.team_name} / ${w.challenge_name || "未关联题目"}`} meta={formatDate(w.submitted_at)} tag={<Tag tone={STATUS_TONE[w.status] ?? "neutral"}>{w.status}</Tag>} />
      )) : <EmptyLine text="暂无 WriteUp" />}
    </InfoCard>
  );
}

function TinyItem({ title, meta, tag }: { title: string; meta: string; tag: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderBottom: "1px solid var(--yza-border-subtle)", padding: "8px 0" }}>
      <span style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--yza-text-muted)" }}>{meta}</div>
      </span>
      {tag}
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <div style={{ padding: "14px 0", color: "var(--yza-text-muted)", fontSize: 13, textAlign: "center" }}>{text}</div>;
}

function smallColumns(a: string, b: string, c: string, d: string) {
  return [
    { key: "name" as const, header: a, width: "34%" },
    { key: "status" as const, header: b, width: "16%" },
    { key: "extra" as const, header: c, width: "18%" },
    { key: "time" as const, header: d, width: "32%" },
  ];
}
