import { useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Button, Tag, Select, Input, Skeleton } from "@yza/ui";
import { toast } from "sonner";
import {
  useCompetition, useUpdateCompetition, useUpdateCompetitionStatus,
  useCompetitionChallenges, useCompetitionRegistrations, useReviewRegistration,
  useDeployAWDServices, useTeardownAWD, useRotateAWDFlags,
} from "@/hooks/useCompetitions";
import { PageShell } from "@/components/PageShell";
import type { CompetitionMode } from "@/types";

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

type Tab = "overview" | "challenges" | "teams" | "mode";

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
      {tab === "mode" && <ModePanel compId={compId} mode={comp.mode} status={comp.status} />}
    </PageShell>
  );
}

function OverviewPanel({ compId, comp }: { compId: number; comp: any }) {
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
      toast.success(`已${status === "approved" ? "通过" : "拒绝"}`);
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
                  {r.status === "pending" && (
                    <div className="yza-button-row">
                      <Button size="sm" tone="primary" onClick={() => handleReview(r.id, "approved")} disabled={reviewMutation.isPending}>通过</Button>
                      <Button size="sm" tone="danger" onClick={() => handleReview(r.id, "rejected")} disabled={reviewMutation.isPending}>拒绝</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
