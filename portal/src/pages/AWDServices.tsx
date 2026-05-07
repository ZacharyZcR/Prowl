import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Tag, Alert } from "@yza/ui";
import { ArrowLeft, FileText, RefreshCw, Swords, Shield, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useMyWriteups, useSubmitWriteup } from "@/hooks/usePortal";

interface ServiceInstance {
  id: number;
  challenge_id: number;
  challenge_name: string;
  status: string;
  access_url: string;
  ports: Record<string, string>;
  ssh_user: string;
  ssh_password: string;
  ssh_address: string;
  expires_at: string;
}

interface CurrentRound {
  round_number: number;
  status: string;
  started_at: string;
}

const STATUS_TONE: Record<string, "success" | "warning" | "neutral" | "danger"> = {
  running: "success",
  starting: "warning",
  stopped: "neutral",
  error: "danger",
};

const WRITEUP_STATUS_TONE: Record<string, "success" | "warning" | "neutral" | "danger" | "info"> = {
  submitted: "warning",
  reviewed: "info",
  approved: "success",
  rejected: "danger",
};

const WRITEUP_STATUS_LABEL: Record<string, string> = {
  submitted: "待审",
  reviewed: "已审阅",
  approved: "已通过",
  rejected: "已驳回",
};

export default function AWDServices() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const compId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [flagInputs, setFlagInputs] = useState<Record<number, string>>({});
  const [writeupInputs, setWriteupInputs] = useState<Record<number, string>>({});

  const { data: services, isLoading } = useQuery({
    queryKey: ["portal-awd-services", compId],
    queryFn: () => api.get<ServiceInstance[]>(`/api/v1/portal/competitions/${compId}/awd/services`).then((r) => r.data),
    refetchInterval: 10_000,
  });

  const { data: currentRound } = useQuery({
    queryKey: ["portal-awd-round", compId],
    queryFn: () => api.get<CurrentRound>(`/api/v1/portal/competitions/${compId}/rounds/current`).then((r) => r.data),
    refetchInterval: 5_000,
    retry: false,
  });

  const { data: writeupData } = useMyWriteups(compId);
  const submitWriteup = useSubmitWriteup();

  const submitMutation = useMutation({
    mutationFn: ({ challengeId, flag }: { challengeId: number; flag: string }) =>
      api.post<{ correct: boolean; points: number; message: string }>(`/api/v1/portal/competitions/${compId}/awd/flags`, { challenge_id: challengeId, flag }).then((r) => r.data),
  });

  const restartMutation = useMutation({
    mutationFn: (challengeId: number) =>
      api.post(`/api/v1/portal/competitions/${compId}/awd/services/${challengeId}/restart`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["portal-awd-services", compId] }); },
  });

  async function handleSubmit(challengeId: number) {
    const flag = flagInputs[challengeId]?.trim();
    if (!flag) return;
    try {
      const result = await submitMutation.mutateAsync({ challengeId, flag });
      if (result.correct) {
        toast.success(`攻击成功！+${result.points} 分`);
        setFlagInputs((p) => ({ ...p, [challengeId]: "" }));
      } else {
        toast.error(result.message || t("competition.flagWrong"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.submitFailed"));
    }
  }

  async function handleRestart(challengeId: number, name: string) {
    if (!confirm(`确定要付费重启「${name}」？将扣除分数，且分数会分配给其他队伍。`)) return;
    try {
      await restartMutation.mutateAsync(challengeId);
      toast.success(t("awd.restarted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("awd.restartFailed"));
    }
  }

  async function handleWriteupSubmit(challengeId: number) {
    const content = writeupInputs[challengeId]?.trim();
    if (!content) {
      toast.error("WriteUp 内容不能为空");
      return;
    }
    try {
      await submitWriteup.mutateAsync({ competitionId: compId, challenge_id: challengeId, content });
      toast.success("WriteUp 已提交");
      setWriteupInputs((p) => ({ ...p, [challengeId]: "" }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "WriteUp 提交失败");
    }
  }

  if (isLoading) return <div className="portal-empty">{t("common.loading")}</div>;
  const writeupByChallenge = new Map((writeupData?.items ?? []).map((item) => [item.challenge_id, item]));

  return (
    <div>
      <button onClick={() => navigate(`/competitions/${compId}`)} className="comp-back" type="button">
        <ArrowLeft size={16} /> {t("competition.backToComp")}
      </button>

      <div className="portal-page-header">
        <div className="portal-page-header__row">
          <div>
            <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Shield size={24} /> 我的服务
            </h1>
            <p>保护你的服务不被攻陷，同时攻击其他队伍</p>
          </div>
          {currentRound && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Tag tone="info">第 {currentRound.round_number} 轮</Tag>
              <Tag tone={currentRound.status === "running" ? "success" : "neutral"}>{t(`status.${currentRound.status}`)}</Tag>
            </div>
          )}
        </div>
      </div>

      {/* 防御区 */}
      <section className="portal-section">
        <div className="portal-section__title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Shield size={18} /> 防御 — 你的服务实例
        </div>
        {(!services || services.length === 0) ? (
          <div className="portal-empty">服务尚未部署，请等待管理员启动比赛环境</div>
        ) : (
          <div className="service-grid">
            {services.map((svc) => {
              const tone = STATUS_TONE[svc.status] ?? "neutral";
              return (
                <div key={svc.id} className="yza-doc-card" style={{ padding: "var(--yza-space-5)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{svc.challenge_name || `Service #${svc.challenge_id}`}</span>
                    <Tag tone={tone}>{t(`status.${svc.status}`)}</Tag>
                  </div>
                  {svc.access_url && (
                    <div style={{ fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: "var(--yza-text-muted)" }}>服务：</span>
                      <code style={{ background: "var(--yza-surface-raised)", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>{svc.access_url}</code>
                    </div>
                  )}
                  {svc.ssh_address && (
                    <div style={{ fontSize: 13, marginBottom: 6, padding: "6px 8px", background: "var(--yza-surface-raised)", borderRadius: 6 }}>
                      <div style={{ color: "var(--yza-text-muted)", fontSize: 11, marginBottom: 2 }}>SSH 连接</div>
                      <code style={{ fontSize: 12, wordBreak: "break-all" }}>
                        ssh {svc.ssh_user}@{svc.ssh_address.replace("http://", "").replace("https://", "")}
                      </code>
                      <div style={{ fontSize: 11, color: "var(--yza-text-muted)", marginTop: 2 }}>
                        密码：<code style={{ userSelect: "all" }}>{svc.ssh_password}</code>
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "var(--yza-text-muted)", marginBottom: 10 }}>
                    过期：{new Date(svc.expires_at).toLocaleString()}
                  </div>
                  <Button
                    size="sm"
                    tone="danger"
                    onClick={() => handleRestart(svc.challenge_id, svc.challenge_name || `#${svc.challenge_id}`)}
                    disabled={restartMutation.isPending}
                  >
                    <RefreshCw size={12} /> 付费重启（扣分）
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 攻击区 */}
      <section className="portal-section">
        <div className="portal-section__title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Swords size={18} /> 攻击 — 提交窃取的 Flag
        </div>
        <div className="yza-doc-card" style={{ padding: "var(--yza-space-5)" }}>
          {services && services.map((svc) => (
            <div key={`atk-${svc.challenge_id}`} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
              <span style={{ width: 130, fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                {svc.challenge_name || `#${svc.challenge_id}`}
              </span>
              <input
                type="text"
                placeholder="flag{...}"
                value={flagInputs[svc.challenge_id] ?? ""}
                onChange={(e) => setFlagInputs((p) => ({ ...p, [svc.challenge_id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(svc.challenge_id); }}
                style={{
                  flex: 1, padding: "6px 10px", border: "1px solid var(--yza-border-default)",
                  borderRadius: "var(--yza-radius-md)", fontSize: 14, background: "var(--yza-surface-page)",
                  color: "var(--yza-text-primary)",
                }}
              />
              <Button size="sm" tone="danger" onClick={() => handleSubmit(svc.challenge_id)} disabled={submitMutation.isPending}>
                <Zap size={12} /> 攻击
              </Button>
            </div>
          ))}
          {(!services || services.length === 0) && (
            <div style={{ color: "var(--yza-text-muted)", fontSize: 14 }}>等待服务部署后可提交 Flag</div>
          )}
        </div>
      </section>

      <Alert tone="info" heading={t("awd.rules")}>
        攻入其他队伍的服务获取 Flag 提交得分。你的服务被攻击会扣等额分数（零和）。服务宕机每轮扣分，存活队伍按比例获得奖励。付费重启会扣分并分配给其他队伍。
      </Alert>

      <section className="portal-section">
        <div className="portal-section__title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={18} /> WriteUp — 闭赛材料
        </div>
        {(!services || services.length === 0) ? (
          <div className="portal-empty">服务部署后可提交 WriteUp</div>
        ) : (
          <div className="service-grid">
            {services.map((svc) => {
              const writeup = writeupByChallenge.get(svc.challenge_id);
              return (
                <div key={`writeup-${svc.challenge_id}`} className="yza-doc-card" style={{ padding: "var(--yza-space-5)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                    <strong>{svc.challenge_name || `Service #${svc.challenge_id}`}</strong>
                    {writeup ? (
                      <Tag tone={WRITEUP_STATUS_TONE[writeup.status] ?? "neutral"}>{WRITEUP_STATUS_LABEL[writeup.status] ?? writeup.status}</Tag>
                    ) : (
                      <Tag tone="neutral">未提交</Tag>
                    )}
                  </div>
                  {writeup ? (
                    <>
                      <div style={{ fontSize: 13, color: "var(--yza-text-secondary)", whiteSpace: "pre-wrap", maxHeight: 120, overflow: "auto" }}>
                        {writeup.content || "未填写正文。"}
                      </div>
                      {writeup.reviewer_comment && (
                        <div style={{ fontSize: 12, color: "var(--yza-text-muted)", marginTop: 8 }}>
                          裁判意见：{writeup.reviewer_comment}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <textarea
                        value={writeupInputs[svc.challenge_id] ?? ""}
                        onChange={(e) => setWriteupInputs((p) => ({ ...p, [svc.challenge_id]: e.target.value }))}
                        placeholder="记录漏洞入口、利用方式、修复动作和关键证据..."
                        rows={5}
                        style={{
                          width: "100%",
                          resize: "vertical",
                          padding: "8px 10px",
                          border: "1px solid var(--yza-border-default)",
                          borderRadius: "var(--yza-radius-md)",
                          background: "var(--yza-surface-page)",
                          color: "var(--yza-text-primary)",
                          fontSize: 13,
                          marginBottom: 8,
                        }}
                      />
                      <Button size="sm" tone="primary" onClick={() => handleWriteupSubmit(svc.challenge_id)} disabled={submitWriteup.isPending}>
                        提交 WriteUp
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
