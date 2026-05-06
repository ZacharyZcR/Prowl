import { useState, type CSSProperties, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { Alert, Button, Tag, Select, Input, Skeleton } from "@yza/ui";
import { toast } from "sonner";
import {
  useCompetition, useUpdateCompetition, useUpdateCompetitionStatus,
  useCompetitionChallenges, useCompetitionRegistrations, useReviewRegistration,
  useDeployAWDServices, useTeardownAWD, useRotateAWDFlags,
  useAdminWriteups, useAntiCheatReport, useCompetitionSubmissions, useReviewWriteup,
} from "@/hooks/useCompetitions";
import { PageShell } from "@/components/PageShell";
import type { Competition, CompetitionMode, TeamRegistration } from "@/types";
import { Activity, AlertTriangle, FileText, ShieldCheck, ShieldX } from "lucide-react";

const MODE_LABEL: Record<CompetitionMode, string> = {
  ctf_jeopardy: "CTF Jeopardy",
  awd: "AWD 攻防",
  red_blue: "红蓝演习",
};

const STATUS_FLOW: Record<string, string[]> = {
  draft: ["registration"],
  registration: ["running", "draft"],
  running: ["paused", "ended"],
  paused: ["running", "ended"],
  ended: ["archived"],
};

type Tab = "overview" | "challenges" | "teams" | "mode" | "audit";

export default function CompetitionManage() {
  const { id } = useParams<{ id: string }>();
  const compId = Number(id);
  const { data: comp, isLoading, error } = useCompetition(compId);
  const [tab, setTab] = useState<Tab>("overview");

  if (isLoading) return <PageShell title="加载中..."><Skeleton count={5} height={40} /></PageShell>;
  if (error || !comp) return <PageShell title="比赛管理"><Alert tone="danger" heading="比赛不存在" /></PageShell>;

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "总览" },
    { key: "challenges", label: "题目" },
    { key: "teams", label: "队伍" },
    { key: "audit", label: "审计" },
    { key: "mode", label: MODE_LABEL[comp.mode] },
  ];

  return (
    <PageShell
      title={comp.title}
      description={
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Tag tone="info">{MODE_LABEL[comp.mode]}</Tag>
          <Tag tone={comp.status === "running" ? "success" : "neutral"}>{comp.status}</Tag>
        </span>
      }
    >
      <nav className="stc-tab-bar" style={{ display: "flex", gap: "var(--yza-space-2)", marginBottom: "var(--yza-space-4)", borderBottom: "1px solid var(--yza-border-default)" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={tab === t.key ? "stc-tab stc-tab--active" : "stc-tab"}
            style={{
              padding: "var(--yza-space-2) var(--yza-space-4)",
              border: "none", background: "none", cursor: "pointer",
              borderBottom: tab === t.key ? "2px solid var(--yza-color-primary-600)" : "2px solid transparent",
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? "var(--yza-text-default)" : "var(--yza-text-secondary)",
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "overview" && <OverviewPanel compId={compId} comp={comp} />}
      {tab === "challenges" && <ChallengesPanel compId={compId} />}
      {tab === "teams" && <TeamsPanel compId={compId} />}
      {tab === "audit" && <AuditPanel compId={compId} />}
      {tab === "mode" && <ModePanel compId={compId} mode={comp.mode} status={comp.status} />}
    </PageShell>
  );
}

function OverviewPanel({ compId, comp }: { compId: number; comp: Competition }) {
  const updateStatus = useUpdateCompetitionStatus();
  const updateComp = useUpdateCompetition();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: comp.title, description: comp.description, rules: comp.rules,
    max_teams: comp.max_teams, max_team_size: comp.max_team_size,
    submit_interval_seconds: comp.submit_interval_seconds ?? 10,
  });

  const nextStatuses = STATUS_FLOW[comp.status] ?? [];

  async function handleStatusChange(status: string) {
    try {
      await updateStatus.mutateAsync({ id: compId, status });
      toast.success(`状态已变更为 ${status}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "变更失败"); }
  }

  async function handleSave() {
    try {
      await updateComp.mutateAsync({ id: compId, ...form });
      toast.success("已保存");
      setEditing(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "保存失败"); }
  }

  return (
    <div className="yza-doc-card" style={{ padding: "var(--yza-space-5)" }}>
      <div className="yza-doc-stack">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>基本信息</h3>
          <div className="yza-button-row">
            {!editing && <Button size="sm" tone="outline" onClick={() => setEditing(true)}>编辑</Button>}
            {editing && <><Button size="sm" tone="outline" onClick={() => setEditing(false)}>取消</Button><Button size="sm" tone="primary" onClick={handleSave} disabled={updateComp.isPending}>保存</Button></>}
          </div>
        </div>

        {editing ? (
          <div className="yza-doc-stack">
            <Input label="标题" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Input label="描述" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <div style={{ display: "flex", gap: "var(--yza-space-3)" }}>
              <Input label="最大队伍数" type="number" value={String(form.max_teams)} onChange={(e) => setForm((f) => ({ ...f, max_teams: Number(e.target.value) }))} />
              <Input label="每队人数" type="number" value={String(form.max_team_size)} onChange={(e) => setForm((f) => ({ ...f, max_team_size: Number(e.target.value) }))} />
              <Input label="提交间隔(秒)" type="number" value={String(form.submit_interval_seconds)} onChange={(e) => setForm((f) => ({ ...f, submit_interval_seconds: Number(e.target.value) }))} />
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--yza-space-3)", fontSize: 14 }}>
            <div><strong>模式：</strong>{MODE_LABEL[comp.mode as CompetitionMode]}</div>
            <div><strong>状态：</strong>{comp.status}</div>
            <div><strong>队伍：</strong>{comp.team_count} / {comp.max_teams || "不限"}</div>
            <div><strong>题目：</strong>{comp.challenge_count}</div>
            <div><strong>每队人数：</strong>{comp.max_team_size}</div>
            <div><strong>提交间隔：</strong>{comp.submit_interval_seconds ?? 10}s</div>
            <div><strong>开始：</strong>{comp.start_time?.slice(0, 16) ?? "未设置"}</div>
            <div><strong>结束：</strong>{comp.end_time?.slice(0, 16) ?? "未设置"}</div>
          </div>
        )}

        {nextStatuses.length > 0 && (
          <div style={{ borderTop: "1px solid var(--yza-border-default)", paddingTop: "var(--yza-space-3)" }}>
            <strong style={{ fontSize: 13 }}>状态变更：</strong>
            <div className="yza-button-row" style={{ marginTop: 8 }}>
              {nextStatuses.map((s) => (
                <Button key={s} size="sm" tone={s === "running" ? "primary" : s === "ended" ? "danger" : "outline"} onClick={() => handleStatusChange(s)} disabled={updateStatus.isPending}>
                  → {s}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChallengesPanel({ compId }: { compId: number }) {
  const { data: challenges, isLoading } = useCompetitionChallenges(compId);

  if (isLoading) return <Skeleton count={3} height={40} />;

  return (
    <div className="yza-doc-card" style={{ padding: "var(--yza-space-5)" }}>
      <h3 style={{ margin: "0 0 var(--yza-space-3)" }}>比赛题目 ({challenges?.length ?? 0})</h3>
      {!challenges?.length ? (
        <div style={{ color: "var(--yza-text-secondary)", fontSize: 14 }}>暂无题目，请通过题目管理添加</div>
      ) : (
        <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--yza-border-default)" }}>
              <th style={{ textAlign: "left", padding: "8px 0" }}>#</th>
              <th style={{ textAlign: "left", padding: "8px 0" }}>题目</th>
              <th style={{ textAlign: "left", padding: "8px 0" }}>分类</th>
              <th style={{ textAlign: "left", padding: "8px 0" }}>难度</th>
              <th style={{ textAlign: "left", padding: "8px 0" }}>可见</th>
            </tr>
          </thead>
          <tbody>
            {challenges.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid var(--yza-border-subtle)" }}>
                <td style={{ padding: "6px 0" }}>{c.order_num}</td>
                <td>{c.challenge_title}</td>
                <td><Tag tone="neutral">{c.category}</Tag></td>
                <td>{c.difficulty}</td>
                <td>{c.is_visible ? <Tag tone="success">可见</Tag> : <Tag tone="neutral">隐藏</Tag>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function TeamsPanel({ compId }: { compId: number }) {
  const { data: regs, isLoading } = useCompetitionRegistrations(compId);
  const reviewMutation = useReviewRegistration();

  async function handleReview(regId: number, status: string) {
    try {
      await reviewMutation.mutateAsync({ competitionId: compId, regId, status });
      toast.success(status === "approved" ? "已恢复参赛资格" : "已取消参赛资格");
    } catch (e) { toast.error(e instanceof Error ? e.message : "操作失败"); }
  }

  if (isLoading) return <Skeleton count={3} height={40} />;

  return (
    <div className="yza-doc-card" style={{ padding: "var(--yza-space-5)" }}>
      <h3 style={{ margin: "0 0 var(--yza-space-3)" }}>参赛队伍 ({regs?.length ?? 0})</h3>
      {!regs?.length ? (
        <div style={{ color: "var(--yza-text-secondary)", fontSize: 14 }}>暂无报名</div>
      ) : (
        <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--yza-border-default)" }}>
              <th style={{ textAlign: "left", padding: "8px 0" }}>队伍</th>
              <th style={{ textAlign: "left", padding: "8px 0" }}>状态</th>
              <th style={{ textAlign: "left", padding: "8px 0" }}>报名时间</th>
              <th style={{ textAlign: "right", padding: "8px 0" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {regs.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--yza-border-subtle)" }}>
                <td style={{ padding: "6px 0" }}>{r.team_name}</td>
                <td><Tag tone={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "warning"}>{r.status}</Tag></td>
                <td>{r.registered_at.slice(0, 10)}</td>
                <td style={{ textAlign: "right" }}>
                  <div className="yza-button-row" style={{ justifyContent: "flex-end" }}>
                    {r.status === "pending" && (
                      <>
                      <Button size="sm" tone="primary" onClick={() => handleReview(r.id, "approved")} disabled={reviewMutation.isPending}>通过</Button>
                      <Button size="sm" tone="danger" onClick={() => handleReview(r.id, "rejected")} disabled={reviewMutation.isPending}>拒绝</Button>
                      </>
                    )}
                    {r.status === "approved" && (
                      <Button size="sm" tone="danger" onClick={() => handleReview(r.id, "rejected")} disabled={reviewMutation.isPending}>取消资格</Button>
                    )}
                    {r.status === "rejected" && (
                      <Button size="sm" tone="primary" onClick={() => handleReview(r.id, "approved")} disabled={reviewMutation.isPending}>恢复资格</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AuditPanel({ compId }: { compId: number }) {
  const { data: report, isLoading: reportLoading } = useAntiCheatReport(compId);
  const { data: writeups, isLoading: writeupsLoading } = useAdminWriteups(compId);
  const { data: submissions, isLoading: submissionsLoading } = useCompetitionSubmissions(compId);
  const { data: regs, isLoading: regsLoading } = useCompetitionRegistrations(compId);
  const reviewWriteup = useReviewWriteup();
  const reviewRegistration = useReviewRegistration();

  const writeupItems = writeups?.items ?? [];
  const submissionItems = submissions?.items ?? [];
  const registrationItems = regs ?? [];
  const pendingWriteups = writeupItems.filter((w) => w.status === "submitted");
  const rejectedTeams = registrationItems.filter((r) => r.status === "rejected");
  const wrongSubmissions = submissionItems.filter((s) => !s.is_correct);
  const isLoading = reportLoading || writeupsLoading || submissionsLoading || regsLoading;

  async function handleWriteupReview(writeupId: number, status: "approved" | "rejected") {
    const comment = status === "approved"
      ? "裁判审核通过：步骤、证据和提交记录基本一致。"
      : "裁判驳回：WriteUp 证据不足或与提交记录不一致。";
    try {
      await reviewWriteup.mutateAsync({ competitionId: compId, writeupId, status, comment });
      toast.success(status === "approved" ? "WriteUp 已通过" : "WriteUp 已驳回");
    } catch (e) { toast.error(e instanceof Error ? e.message : "审核失败"); }
  }

  async function handleSanction(reg: TeamRegistration, status: string) {
    try {
      await reviewRegistration.mutateAsync({ competitionId: compId, regId: reg.id, status });
      toast.success(status === "approved" ? `${reg.team_name} 已恢复参赛` : `${reg.team_name} 已取消资格`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "操作失败"); }
  }

  if (isLoading) return <Skeleton count={5} height={44} />;

  return (
    <div className="yza-doc-stack">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "var(--yza-space-3)" }}>
        <AuditKpi icon={<AlertTriangle size={18} />} label="跨队 Flag 告警" value={report?.cross_flag_alerts?.length ?? 0} tone="danger" />
        <AuditKpi icon={<FileText size={18} />} label="待审 WriteUp" value={pendingWriteups.length} tone="warning" />
        <AuditKpi icon={<ShieldX size={18} />} label="已禁赛队伍" value={rejectedTeams.length} tone="danger" />
        <AuditKpi icon={<Activity size={18} />} label="错误提交" value={wrongSubmissions.length} tone="neutral" />
      </div>

      <AuditSection title="反作弊告警" action={<Tag tone={(report?.cross_flag_alerts?.length ?? 0) > 0 ? "danger" : "success"}>{formatDateTime(report?.generated_at)}</Tag>}>
        {(report?.cross_flag_alerts?.length ?? 0) === 0 ? (
          <EmptyAuditText text="暂无跨队 Flag 告警" />
        ) : (
          <table className="yza-data-table" style={auditTableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>提交队伍</th>
                <th style={thStyle}>疑似受害队伍</th>
                <th style={thStyle}>题目</th>
                <th style={thStyle}>Flag</th>
                <th style={thStyle}>时间</th>
              </tr>
            </thead>
            <tbody>
              {report?.cross_flag_alerts.map((a, idx) => (
                <tr key={`${a.submitter_team_id}-${a.victim_team_id}-${a.challenge_id}-${idx}`}>
                  <td style={tdStyle}>{a.submitter_team_name}</td>
                  <td style={tdStyle}>{a.victim_team_name}</td>
                  <td style={tdStyle}>{a.challenge_name}</td>
                  <td style={{ ...tdStyle, fontFamily: "monospace" }}>{maskFlag(a.submitted_flag)}</td>
                  <td style={tdStyle}>{formatDateTime(a.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AuditSection>

      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: "var(--yza-space-4)", alignItems: "start" }}>
        <AuditSection title="WriteUp 审核" action={<Tag tone="neutral">{writeupItems.length}</Tag>}>
          {writeupItems.length === 0 ? (
            <EmptyAuditText text="暂无 WriteUp 提交" />
          ) : (
            <div className="yza-doc-stack">
              {writeupItems.map((w) => (
                <div key={w.id} style={auditItemStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <strong>{w.team_name} / {w.challenge_name}</strong>
                    <Tag tone={w.status === "approved" ? "success" : w.status === "rejected" ? "danger" : "warning"}>{w.status}</Tag>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--yza-text-secondary)" }}>
                    {w.username} · {formatDateTime(w.submitted_at)}
                  </div>
                  <div style={auditContentStyle}>{w.content}</div>
                  {w.reviewer_comment && <div style={{ fontSize: 12, color: "var(--yza-text-secondary)" }}>裁判意见：{w.reviewer_comment}</div>}
                  {w.status === "submitted" && (
                    <div className="yza-button-row" style={{ justifyContent: "flex-end" }}>
                      <Button size="sm" tone="primary" onClick={() => handleWriteupReview(w.id, "approved")} disabled={reviewWriteup.isPending}>
                        <ShieldCheck size={13} /> 通过
                      </Button>
                      <Button size="sm" tone="danger" onClick={() => handleWriteupReview(w.id, "rejected")} disabled={reviewWriteup.isPending}>
                        <ShieldX size={13} /> 驳回
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </AuditSection>

        <AuditSection title="队伍处置" action={<Tag tone="neutral">{registrationItems.length}</Tag>}>
          {registrationItems.length === 0 ? (
            <EmptyAuditText text="暂无报名队伍" />
          ) : (
            <div className="yza-doc-stack">
              {registrationItems.map((r) => (
                <div key={r.id} style={auditItemStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <strong>{r.team_name}</strong>
                    <Tag tone={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "warning"}>{r.status}</Tag>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--yza-text-secondary)" }}>报名：{formatDateTime(r.registered_at)}</div>
                  <div className="yza-button-row" style={{ justifyContent: "flex-end" }}>
                    {r.status === "approved" && (
                      <Button size="sm" tone="danger" onClick={() => handleSanction(r, "rejected")} disabled={reviewRegistration.isPending}>取消资格</Button>
                    )}
                    {r.status === "rejected" && (
                      <Button size="sm" tone="primary" onClick={() => handleSanction(r, "approved")} disabled={reviewRegistration.isPending}>恢复资格</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </AuditSection>
      </div>

      <AuditSection title="提交流水" action={<Tag tone="neutral">{submissionItems.length}</Tag>}>
        {submissionItems.length === 0 ? (
          <EmptyAuditText text="暂无提交记录" />
        ) : (
          <table className="yza-data-table" style={auditTableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>队伍</th>
                <th style={thStyle}>题目</th>
                <th style={thStyle}>结果</th>
                <th style={thStyle}>分数</th>
                <th style={thStyle}>IP</th>
                <th style={thStyle}>Flag</th>
                <th style={thStyle}>时间</th>
              </tr>
            </thead>
            <tbody>
              {submissionItems.slice(0, 30).map((s) => (
                <tr key={s.id}>
                  <td style={tdStyle}>{s.team_name}</td>
                  <td style={tdStyle}>{s.challenge_name}</td>
                  <td style={tdStyle}>{s.is_correct ? <Tag tone="success">正确</Tag> : <Tag tone="danger">错误</Tag>}</td>
                  <td style={tdStyle}>{s.points_awarded}</td>
                  <td style={tdStyle}>{s.ip || "-"}</td>
                  <td style={{ ...tdStyle, fontFamily: "monospace" }}>{maskFlag(s.submitted_flag)}</td>
                  <td style={tdStyle}>{formatDateTime(s.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AuditSection>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--yza-space-4)" }}>
        <AuditSection title="IP 关联" action={<Tag tone="neutral">{report?.ip_correlations?.length ?? 0}</Tag>}>
          {(report?.ip_correlations?.length ?? 0) === 0 ? (
            <EmptyAuditText text="暂无多队同 IP 关联" />
          ) : report?.ip_correlations.map((i) => (
            <div key={i.ip} style={auditItemStyle}>
              <strong>{i.ip}</strong>
              <div style={{ fontSize: 12, color: "var(--yza-text-secondary)" }}>{i.team_names.join("、")} · {i.count} 次</div>
            </div>
          ))}
        </AuditSection>

        <AuditSection title="快速解题关联" action={<Tag tone="neutral">{report?.rapid_submissions?.length ?? 0}</Tag>}>
          {(report?.rapid_submissions?.length ?? 0) === 0 ? (
            <EmptyAuditText text="暂无快速解题关联" />
          ) : report?.rapid_submissions.map((r, idx) => (
            <div key={`${r.challenge_id}-${r.team_a_id}-${r.team_b_id}-${idx}`} style={auditItemStyle}>
              <strong>{r.challenge_name}</strong>
              <div style={{ fontSize: 12, color: "var(--yza-text-secondary)" }}>
                {r.team_a_name} / {r.team_b_name} · 相差 {r.time_diff_secs}s
              </div>
            </div>
          ))}
        </AuditSection>
      </div>
    </div>
  );
}

function ModePanel({ compId, mode, status }: { compId: number; mode: CompetitionMode; status: string }) {
  switch (mode) {
    case "ctf_jeopardy": return <CTFPanel />;
    case "awd": return <AWDPanel compId={compId} status={status} />;
    case "red_blue": return <RedBluePanel compId={compId} />;
  }
}

function CTFPanel() {
  return (
    <div className="yza-doc-card" style={{ padding: "var(--yza-space-5)" }}>
      <h3 style={{ margin: "0 0 var(--yza-space-3)" }}>CTF Jeopardy 设置</h3>
      <div style={{ fontSize: 14, color: "var(--yza-text-secondary)" }}>
        <p>CTF 模式下：</p>
        <ul style={{ margin: "8px 0", paddingLeft: 20 }}>
          <li>选手独立解题提交 flag</li>
          <li>动态计分（指数衰减公式）</li>
          <li>前三血分级奖励（5% / 3% / 1%）</li>
          <li>支持静态 flag、动态 flag、动态附件、正则匹配</li>
          <li>自动反作弊检测（跨队 flag + Leet 变体 + IP 关联 + 快速提交）</li>
        </ul>
        <p style={{ marginTop: 12 }}>题目管理和计分板冻结在「总览」和「题目」页签中操作。</p>
      </div>
    </div>
  );
}

function AWDPanel({ compId, status }: { compId: number; status: string }) {
  const deployMutation = useDeployAWDServices();
  const teardownMutation = useTeardownAWD();
  const rotateMutation = useRotateAWDFlags();
  const [round, setRound] = useState(1);

  return (
    <div className="yza-doc-card" style={{ padding: "var(--yza-space-5)" }}>
      <h3 style={{ margin: "0 0 var(--yza-space-3)" }}>AWD 攻防管理</h3>
      <div className="yza-doc-stack">
        <div className="yza-button-row">
          <Button tone="primary" onClick={() => { deployMutation.mutateAsync(compId).then(() => toast.success("部署成功")).catch((e) => toast.error(e instanceof Error ? e.message : "部署失败")); }} disabled={deployMutation.isPending || status !== "running"}>
            部署服务
          </Button>
          <Button tone="danger" onClick={() => { teardownMutation.mutateAsync(compId).then(() => toast.success("已销毁")).catch((e) => toast.error(e instanceof Error ? e.message : "销毁失败")); }} disabled={teardownMutation.isPending}>
            销毁环境
          </Button>
        </div>

        <div style={{ borderTop: "1px solid var(--yza-border-default)", paddingTop: "var(--yza-space-3)" }}>
          <strong style={{ fontSize: 13 }}>Flag 轮换</strong>
          <div style={{ display: "flex", gap: "var(--yza-space-2)", alignItems: "end", marginTop: 8 }}>
            <Input label="轮次号" type="number" value={String(round)} onChange={(e) => setRound(Number(e.target.value))} style={{ width: 100 }} />
            <Button tone="accent" onClick={() => { rotateMutation.mutateAsync({ competitionId: compId, round }).then(() => { toast.success(`轮次 ${round} flag 已轮换`); setRound((r) => r + 1); }).catch((e) => toast.error(e instanceof Error ? e.message : "轮换失败")); }} disabled={rotateMutation.isPending || status !== "running"}>
              轮换 Flag
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RedBluePanel({ compId }: { compId: number }) {
  return (
    <div className="yza-doc-card" style={{ padding: "var(--yza-space-5)" }}>
      <h3 style={{ margin: "0 0 var(--yza-space-3)" }}>红蓝演习管理</h3>
      <div style={{ fontSize: 14, color: "var(--yza-text-secondary)" }}>
        <p>红蓝演习模式下：</p>
        <ul style={{ margin: "8px 0", paddingLeft: 20 }}>
          <li>红队提交攻击报告，蓝队提交防御报告</li>
          <li>裁判评审报告并打分</li>
          <li>支持多阶段演练（阶段推进在后端 API 操作）</li>
          <li>报告审核和成绩查看在参赛端进行</li>
        </ul>
      </div>
    </div>
  );
}

function AuditKpi({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: "danger" | "warning" | "neutral" }) {
  const color = tone === "danger"
    ? "var(--yza-color-danger-600)"
    : tone === "warning"
      ? "var(--yza-color-warning-600)"
      : "var(--yza-text-primary)";
  return (
    <div className="yza-doc-card" style={{ padding: "var(--yza-space-4)", display: "flex", alignItems: "center", gap: "var(--yza-space-3)" }}>
      <div style={{ color, display: "flex" }}>{icon}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: "var(--yza-text-secondary)", marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

function AuditSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="yza-doc-card" style={{ padding: "var(--yza-space-5)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: "var(--yza-space-3)" }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyAuditText({ text }: { text: string }) {
  return <div style={{ fontSize: 13, color: "var(--yza-text-secondary)" }}>{text}</div>;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function maskFlag(flag: string) {
  if (!flag) return "-";
  return flag.length > 28 ? `${flag.slice(0, 24)}...` : flag;
}

const auditTableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "8px 6px",
  borderBottom: "1px solid var(--yza-border-default)",
  color: "var(--yza-text-secondary)",
};

const tdStyle: CSSProperties = {
  padding: "8px 6px",
  borderBottom: "1px solid var(--yza-border-subtle)",
  verticalAlign: "top",
};

const auditItemStyle: CSSProperties = {
  padding: "var(--yza-space-3)",
  border: "1px solid var(--yza-border-subtle)",
  borderRadius: "var(--yza-radius-md)",
  background: "var(--yza-surface-subtle)",
};

const auditContentStyle: CSSProperties = {
  marginTop: 8,
  padding: "var(--yza-space-3)",
  maxHeight: 120,
  overflow: "auto",
  whiteSpace: "pre-wrap",
  fontSize: 13,
  color: "var(--yza-text-primary)",
  background: "var(--yza-surface-page)",
  border: "1px solid var(--yza-border-subtle)",
  borderRadius: "var(--yza-radius-md)",
};
