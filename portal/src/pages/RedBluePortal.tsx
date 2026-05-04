import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Tag, Select, Alert } from "@yza/ui";
import { ArrowLeft, Swords, Shield, Send, Paperclip, X } from "lucide-react";
import { api } from "@/lib/api";
import { useCompetition, useObjectives } from "@/hooks/usePortal";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface Phase { id: number; name: string; status: string; }
interface Report {
  id: number; title: string; status: string; score: number;
  judge_comment: string; submitted_at: string; severity?: string; action_type?: string;
  attachment_ids?: number[];
}

const STATUS_TONE: Record<string, "warning" | "info" | "success" | "danger"> = {
  submitted: "warning", reviewing: "info", accepted: "success", rejected: "danger",
};

const ACCEPT_TYPES = ".md,.markdown,.docx,.doc,.pdf,.txt,.zip";

export default function RedBluePortal() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const compId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: comp } = useCompetition(compId);
  const teamRole = comp?.team_role ?? "participant";

  const isJudge = teamRole === "judge" || teamRole === "white";
  const isRed = teamRole === "red" || teamRole === "participant";
  const isBlue = teamRole === "blue" || teamRole === "participant";
  const canSubmit = !isJudge && (isRed || isBlue);
  const defaultTab = teamRole === "blue" ? "blue" as const : "red" as const;
  const [tab, setTab] = useState<"red" | "blue">(defaultTab);

  const { data: phases } = useQuery({
    queryKey: ["rb-phases", compId],
    queryFn: () => api.get<Phase[]>(`/api/v1/portal/competitions/${compId}/phases`).then((r) => r.data),
  });
  const { data: myAttacks } = useQuery({
    queryKey: ["rb-my-attacks", compId],
    queryFn: () => api.get(`/api/v1/portal/competitions/${compId}/attack-reports/my`).then((r) => (r.data as { items: Report[] }).items),
    enabled: isRed,
  });
  const { data: myDefenses } = useQuery({
    queryKey: ["rb-my-defenses", compId],
    queryFn: () => api.get(`/api/v1/portal/competitions/${compId}/defense-reports/my`).then((r) => (r.data as { items: Report[] }).items),
    enabled: isBlue,
  });

  const { data: objectives } = useObjectives(compId, tab === "red" ? "red" : "blue");
  const objOptions = (objectives ?? []).sort((a, b) => a.order_num - b.order_num);

  const [form, setForm] = useState({
    title: "", content: "", severity: "medium", vuln_type: "", target: "", impact: "",
    att_ck_technique: "", action_type: "detection", threat_description: "", mitigation: "",
    objective_id: 0,
  });
  const [attachments, setAttachments] = useState<number[]>([]);
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const resp = await api.post<{ id: number }>("/api/v1/files/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAttachments((p) => [...p, resp.data.id]);
      setAttachmentNames((p) => [...p, file.name]);
      toast.success(`附件 ${file.name} 上传成功`);
    } catch {
      toast.error(t("common.uploadFailed"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeAttachment(idx: number) {
    setAttachments((p) => p.filter((_, i) => i !== idx));
    setAttachmentNames((p) => p.filter((_, i) => i !== idx));
  }

  const submitAttack = useMutation({
    mutationFn: () => api.post(`/api/v1/portal/competitions/${compId}/attack-reports`, {
      title: form.title, content: form.content, severity: form.severity,
      vuln_type: form.vuln_type, target: form.target, impact: form.impact,
      att_ck_technique: form.att_ck_technique, objective_id: form.objective_id || undefined,
      attachment_ids: attachments,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rb-my-attacks"] });
      toast.success(t("redblue.attackSubmitted"));
      setForm((p) => ({ ...p, title: "", content: "", vuln_type: "", target: "", impact: "", att_ck_technique: "" }));
      setAttachments([]); setAttachmentNames([]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("common.submitFailed")),
  });
  const submitDefense = useMutation({
    mutationFn: () => api.post(`/api/v1/portal/competitions/${compId}/defense-reports`, {
      title: form.title, content: form.content, action_type: form.action_type,
      threat_description: form.threat_description, mitigation: form.mitigation,
      objective_id: form.objective_id || undefined, attachment_ids: attachments,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rb-my-defenses"] });
      toast.success(t("redblue.defenseSubmitted"));
      setForm((p) => ({ ...p, title: "", content: "", threat_description: "", mitigation: "" }));
      setAttachments([]); setAttachmentNames([]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("common.submitFailed")),
  });

  const activePhase = phases?.find((p) => p.status === "active");
  const reports = tab === "red" ? myAttacks : myDefenses;

  return (
    <div>
      <button onClick={() => navigate(`/competitions/${compId}`)} className="comp-back" type="button">
        <ArrowLeft size={16} /> {t("competition.backToComp")}
      </button>

      <div className="portal-page-header">
        <div className="portal-page-header__row">
          <h1>{tab === "red" ? <><Swords size={22} /> {t("redblue.attackReport")}</> : <><Shield size={22} /> {t("redblue.defenseReport")}</>}</h1>
          {activePhase && <Tag tone="info">{t("redblue.currentPhase")}：{activePhase.name}</Tag>}
        </div>
      </div>

      {/* 仅在 participant（未分配角色）时显示 tab 切换，否则锁定对应角色 */}
      {isRed && isBlue ? (
        <div className="rb-tab-bar">
          <button onClick={() => setTab("red")} className={`rb-tab rb-tab--red${tab === "red" ? " rb-tab--active" : ""}`} type="button">
            <Swords size={14} /> {t("redblue.attackReport")}
          </button>
          <button onClick={() => setTab("blue")} className={`rb-tab rb-tab--blue${tab === "blue" ? " rb-tab--active" : ""}`} type="button">
            <Shield size={14} /> {t("redblue.defenseReport")}
          </button>
        </div>
      ) : (
        <Alert tone={isRed ? "danger" : "info"} heading={`${t("redblue.yourRole")}：${isRed ? t("role.red") : t("role.blue")}`}>
          {isRed ? t("redblue.redOnly") : t("redblue.blueOnly")}
        </Alert>
      )}

      <div className={canSubmit ? "portal-two-col" : ""}>
        {/* Submit form */}
        {canSubmit && <section className="yza-doc-card" style={{ padding: "var(--yza-space-5)" }}>
          <h3 style={{ margin: "0 0 var(--yza-space-4)", fontSize: 16, fontWeight: 700 }}>
            {tab === "red" ? t("redblue.submitAttack") : t("redblue.submitDefense")}
          </h3>
          <div className="yza-doc-stack">
            <input className="rb-input" placeholder={t("redblue.reportTitle")} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            <Select value={String(form.objective_id)} onChange={(e) => setForm((p) => ({ ...p, objective_id: Number(e.target.value) }))}>
              <option value="0">{t("redblue.relatedObjective")}</option>
              {objOptions.map((o) => (
                <option key={o.id} value={o.id}>[{o.order_num}] {o.title}</option>
              ))}
            </Select>
            <textarea className="rb-textarea" placeholder={t("redblue.reportContent")} rows={6} value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} />
            {tab === "red" ? (
              <>
                <Select value={form.severity} onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value }))}>
                  <option value="info">Info</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                </Select>
                <input className="rb-input" placeholder={t("redblue.vulnType")} value={form.vuln_type} onChange={(e) => setForm((p) => ({ ...p, vuln_type: e.target.value }))} />
                <input className="rb-input" placeholder={t("redblue.attackTarget")} value={form.target} onChange={(e) => setForm((p) => ({ ...p, target: e.target.value }))} />
                <input className="rb-input" placeholder={t("redblue.attckTechnique")} value={form.att_ck_technique} onChange={(e) => setForm((p) => ({ ...p, att_ck_technique: e.target.value }))} />
              </>
            ) : (
              <>
                <Select value={form.action_type} onChange={(e) => setForm((p) => ({ ...p, action_type: e.target.value }))}>
                  <option value="detection">{t("redblue.actionDetection")}</option>
                  <option value="response">{t("redblue.actionResponse")}</option>
                  <option value="hardening">{t("redblue.actionHardening")}</option>
                  <option value="other">{t("redblue.actionOther")}</option>
                </Select>
                <input className="rb-input" placeholder={t("redblue.threatDesc")} value={form.threat_description} onChange={(e) => setForm((p) => ({ ...p, threat_description: e.target.value }))} />
                <textarea className="rb-textarea" placeholder={t("redblue.mitigation")} rows={3} value={form.mitigation} onChange={(e) => setForm((p) => ({ ...p, mitigation: e.target.value }))} />
              </>
            )}

            {/* 附件上传 */}
            <div>
              <input ref={fileRef} type="file" accept={ACCEPT_TYPES} onChange={handleFileUpload} style={{ display: "none" }} />
              <Button tone="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Paperclip size={14} /> {uploading ? t("redblue.uploading") : t("redblue.addAttachment")}
              </Button>
              <span style={{ fontSize: 12, color: "var(--yza-text-muted)", marginLeft: 8 }}>{t("redblue.attachFormats")}</span>
              {attachmentNames.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {attachmentNames.map((name, i) => (
                    <Tag key={i} tone="neutral">
                      {name}
                      <button type="button" onClick={() => removeAttachment(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 4px", display: "inline-flex" }}>
                        <X size={12} />
                      </button>
                    </Tag>
                  ))}
                </div>
              )}
            </div>

            <Button tone={tab === "red" ? "danger" : "primary"} onClick={() => { tab === "red" ? submitAttack.mutate() : submitDefense.mutate(); }} disabled={!form.title.trim() || submitAttack.isPending || submitDefense.isPending}>
              <Send size={14} /> {t("redblue.submitReport")}
            </Button>
          </div>
        </section>}

        {/* My reports */}
        <section>
          <h3 style={{ margin: "0 0 var(--yza-space-4)", fontSize: 16, fontWeight: 700 }}>{t("redblue.myReports")}</h3>
          {(!reports || reports.length === 0) ? (
            <div className="portal-empty">{tab === "red" ? t("redblue.noAttack") : t("redblue.noDefense")}</div>
          ) : (
            <div className="report-list">
              {reports.map((r) => (
                <div key={r.id} className="report-item">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{r.title}</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <Tag tone={STATUS_TONE[r.status] ?? "neutral"}>{t(`status.${r.status}`)}</Tag>
                      {r.score > 0 && <Tag tone="success">+{r.score}</Tag>}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--yza-text-muted)" }}>
                    {r.severity && <Tag tone="warning">{r.severity}</Tag>}
                    {r.action_type && <Tag tone="neutral">{r.action_type}</Tag>}
                    {r.attachment_ids && r.attachment_ids.length > 0 && <Tag tone="info"><Paperclip size={10} /> {r.attachment_ids.length}</Tag>}
                    {" "}{r.submitted_at.replace("T", " ").slice(0, 19)}
                  </div>
                  {r.judge_comment && <div className="report-item__judge">裁判：{r.judge_comment}</div>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
