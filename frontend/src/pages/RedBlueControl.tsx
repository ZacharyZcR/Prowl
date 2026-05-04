import { useState, type ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, DataTable, Modal, Input, Select, Tag } from "@yza/ui";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { formatDate } from "@/lib/datetime";

type TagTone = "info" | "success" | "warning" | "neutral" | "danger";

interface Phase { id: number; name: string; status: string; order_num: number; started_at: string; ended_at: string; }
interface Report { id: number; title: string; team_name: string; username: string; severity?: string; action_type?: string; status: string; score: number; submitted_at: string; }

const STATUS_TONE: Record<string, TagTone> = { submitted: "warning", reviewing: "info", accepted: "success", rejected: "danger" };
const SEV_TONE: Record<string, TagTone> = { critical: "danger", high: "warning", medium: "info", low: "neutral", info: "neutral" };
const PHASE_TONE: Record<string, TagTone> = { pending: "neutral", active: "success", completed: "info" };

export default function RedBlueControl() {
  const { id } = useParams<{ id: string }>();
  const compId = Number(id);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: phases } = useQuery({ queryKey: ["rb-phases-admin", compId], queryFn: () => api.get<Phase[]>(`/api/v1/competitions/${compId}/phases`).then((r) => r.data) });
  const { data: attacks } = useQuery({ queryKey: ["rb-attacks-admin", compId], queryFn: () => api.get(`/api/v1/competitions/${compId}/attack-reports`).then((r) => (r.data as { items: Report[] }).items) });
  const { data: defenses } = useQuery({ queryKey: ["rb-defenses-admin", compId], queryFn: () => api.get(`/api/v1/competitions/${compId}/defense-reports`).then((r) => (r.data as { items: Report[] }).items) });

  const advancePhase = useMutation({ mutationFn: () => api.post(`/api/v1/competitions/${compId}/phases/advance`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["rb-phases-admin"] }); toast.success("阶段已推进"); } });
  const [phaseForm, setPhaseForm] = useState({ name: "", description: "", duration_minutes: 60 });
  const [phaseOpen, setPhaseOpen] = useState(false);
  const createPhase = useMutation({ mutationFn: () => api.post(`/api/v1/competitions/${compId}/phases`, phaseForm), onSuccess: () => { qc.invalidateQueries({ queryKey: ["rb-phases-admin"] }); setPhaseOpen(false); toast.success("阶段已创建"); } });

  const [judgeTarget, setJudgeTarget] = useState<{ type: "attack" | "defense"; id: number; title: string } | null>(null);
  const [judgeForm, setJudgeForm] = useState({ status: "accepted", score: 0, comment: "" });
  const judgeAttack = useMutation({ mutationFn: () => api.put(`/api/v1/competitions/${compId}/attack-reports/${judgeTarget!.id}/judge`, judgeForm), onSuccess: () => { qc.invalidateQueries({ queryKey: ["rb-attacks-admin"] }); setJudgeTarget(null); toast.success("已审核"); } });
  const judgeDefense = useMutation({ mutationFn: () => api.put(`/api/v1/competitions/${compId}/defense-reports/${judgeTarget!.id}/judge`, judgeForm), onSuccess: () => { qc.invalidateQueries({ queryKey: ["rb-defenses-admin"] }); setJudgeTarget(null); toast.success("已审核"); } });

  function openJudge(type: "attack" | "defense", r: Report) {
    setJudgeTarget({ type, id: r.id, title: r.title });
    setJudgeForm({ status: "accepted", score: 0, comment: "" });
  }

  interface ReportRow extends Record<string, ReactNode> { title: ReactNode; team: ReactNode; tag: ReactNode; status: ReactNode; score: ReactNode; time: ReactNode; actions: ReactNode; }

  const attackCols = [
    { key: "title" as const, header: "标题", width: "25%" }, { key: "team" as const, header: "红队", width: "12%" },
    { key: "tag" as const, header: "严重程度", width: "10%" }, { key: "status" as const, header: "状态", width: "10%" },
    { key: "score" as const, header: "得分", width: "8%" }, { key: "time" as const, header: "提交时间", width: "15%" },
    { key: "actions" as const, header: "", width: "10%", align: "right" as const },
  ];

  const attackRows: ReportRow[] = (attacks ?? []).map((r) => ({
    title: r.title, team: r.team_name, tag: <Tag tone={SEV_TONE[r.severity ?? ""] ?? "neutral"}>{r.severity}</Tag>,
    status: <Tag tone={STATUS_TONE[r.status]}>{r.status}</Tag>, score: r.score || "—",
    time: formatDate(r.submitted_at), actions: r.status === "submitted" ? <Button size="sm" tone="outline" onClick={() => openJudge("attack", r)}>审核</Button> : null,
  }));

  const defenseCols = [
    { key: "title" as const, header: "标题", width: "25%" }, { key: "team" as const, header: "蓝队", width: "12%" },
    { key: "tag" as const, header: "类型", width: "10%" }, { key: "status" as const, header: "状态", width: "10%" },
    { key: "score" as const, header: "得分", width: "8%" }, { key: "time" as const, header: "提交时间", width: "15%" },
    { key: "actions" as const, header: "", width: "10%", align: "right" as const },
  ];

  const defenseRows: ReportRow[] = (defenses ?? []).map((r) => ({
    title: r.title, team: r.team_name, tag: <Tag tone="info">{r.action_type}</Tag>,
    status: <Tag tone={STATUS_TONE[r.status]}>{r.status}</Tag>, score: r.score || "—",
    time: formatDate(r.submitted_at), actions: r.status === "submitted" ? <Button size="sm" tone="outline" onClick={() => openJudge("defense", r)}>审核</Button> : null,
  }));

  return (
    <PageShell title="红蓝对抗控制" description="管理演习阶段，审核红蓝双方报告。"
      actions={<div className="yza-button-row"><Button tone="outline" onClick={() => navigate(-1)}>返回</Button><Button tone="outline" onClick={() => setPhaseOpen(true)}>添加阶段</Button><Button tone="primary" onClick={() => advancePhase.mutate()} disabled={advancePhase.isPending}>推进阶段</Button></div>}
    >
      <h3 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>演习阶段</h3>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {(phases ?? []).map((p) => (
          <div key={p.id} style={{ padding: "0.5rem 1rem", border: "1px solid #e5e7eb", borderRadius: "0.375rem", minWidth: 120, textAlign: "center" }}>
            <div style={{ fontWeight: 500, marginBottom: "0.25rem" }}>{p.name}</div>
            <Tag tone={PHASE_TONE[p.status] ?? "neutral"}>{p.status}</Tag>
          </div>
        ))}
        {(!phases || phases.length === 0) && <span style={{ color: "#9ca3af" }}>暂无阶段</span>}
      </div>

      <h3 style={{ fontWeight: 600, marginBottom: "0.5rem", color: "#ef4444" }}>红队攻击报告 ({attacks?.length ?? 0})</h3>
      <section className="yza-doc-card stc-table-card" style={{ marginBottom: "1.5rem" }}>
        {attackRows.length === 0 ? <div style={{ padding: "1rem", textAlign: "center", color: "#9ca3af" }}>暂无报告</div> : <DataTable<ReportRow> columns={attackCols} rows={attackRows} />}
      </section>

      <h3 style={{ fontWeight: 600, marginBottom: "0.5rem", color: "#3b82f6" }}>蓝队防御报告 ({defenses?.length ?? 0})</h3>
      <section className="yza-doc-card stc-table-card">
        {defenseRows.length === 0 ? <div style={{ padding: "1rem", textAlign: "center", color: "#9ca3af" }}>暂无报告</div> : <DataTable<ReportRow> columns={defenseCols} rows={defenseRows} />}
      </section>

      <Modal open={phaseOpen} title="添加演习阶段" onClose={() => setPhaseOpen(false)}
        footer={<div className="yza-button-row"><Button tone="outline" onClick={() => setPhaseOpen(false)}>{t("common.cancel")}</Button><Button tone="primary" onClick={() => createPhase.mutate()} disabled={createPhase.isPending}>{t("common.create")}</Button></div>}
      >
        <div className="yza-doc-stack">
          <Input label="阶段名称" value={phaseForm.name} onChange={(e) => setPhaseForm((p) => ({ ...p, name: e.target.value }))} />
          <Input label="时长（分钟）" type="number" value={String(phaseForm.duration_minutes)} onChange={(e) => setPhaseForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))} />
        </div>
      </Modal>

      <Modal open={judgeTarget !== null} title={`审核报告：${judgeTarget?.title ?? ""}`} onClose={() => setJudgeTarget(null)}
        footer={<div className="yza-button-row"><Button tone="outline" onClick={() => setJudgeTarget(null)}>{t("common.cancel")}</Button><Button tone="primary" onClick={() => { judgeTarget?.type === "attack" ? judgeAttack.mutate() : judgeDefense.mutate(); }}>确认审核</Button></div>}
      >
        <div className="yza-doc-stack">
          <Select label="结果" value={judgeForm.status} onChange={(e) => setJudgeForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="accepted">通过</option><option value="rejected">驳回</option>
          </Select>
          <Input label="打分" type="number" value={String(judgeForm.score)} onChange={(e) => setJudgeForm((p) => ({ ...p, score: Number(e.target.value) }))} />
          <div><label className="yza-label">评语</label><textarea className="yza-textarea" rows={3} value={judgeForm.comment} onChange={(e) => setJudgeForm((p) => ({ ...p, comment: e.target.value }))} /></div>
        </div>
      </Modal>
    </PageShell>
  );
}
