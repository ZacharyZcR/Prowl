import { useState, type ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Button, DataTable, Tag } from "@yza/ui";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { formatDate } from "@/lib/datetime";

type TagTone = "info" | "success" | "warning" | "neutral" | "danger";

interface Round {
  id: number;
  round_number: number;
  status: string;
  started_at: string;
  ended_at?: string;
}

interface CheckResult {
  id: number;
  team_name: string;
  challenge_name: string;
  status: string;
  detail: string;
  checked_at: string;
}

function useRounds(compId: number) {
  return useQuery({
    queryKey: ["awd-rounds", compId],
    queryFn: () => api.get<Round[]>(`/api/v1/competitions/${compId}/rounds`).then((r) => r.data),
    enabled: compId > 0,
    refetchInterval: 5000,
  });
}

function useRoundResults(compId: number, roundId: number) {
  return useQuery({
    queryKey: ["awd-round-results", roundId],
    queryFn: () => api.get<CheckResult[]>(`/api/v1/competitions/${compId}/rounds/${roundId}/results`).then((r) => r.data),
    enabled: roundId > 0,
  });
}

interface AWDConfig {
  round_interval: number;
  attack_score: number;
  defense_score: number;
  check_score: number;
}

function useAWDConfig(compId: number) {
  return useQuery({
    queryKey: ["awd-config", compId],
    queryFn: () => api.get<AWDConfig>(`/api/v1/competitions/${compId}/awd/config`).then((r) => r.data),
    enabled: compId > 0,
  });
}

function useUpdateAWDConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ compId, ...payload }: { compId: number } & Partial<AWDConfig>) =>
      api.put(`/api/v1/competitions/${compId}/awd/config`, payload),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["awd-config", v.compId] }),
  });
}

function useDeploy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (compId: number) => api.post(`/api/v1/competitions/${compId}/awd/deploy`).then((r) => r.data as { deployed: number; failed: number; errors?: string[] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["awd-rounds"] }),
  });
}

function useTeardown() {
  return useMutation({
    mutationFn: (compId: number) => api.post(`/api/v1/competitions/${compId}/awd/teardown`),
  });
}

function useExecuteRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (compId: number) => api.post(`/api/v1/competitions/${compId}/rounds/execute`),
    onSuccess: (_d, compId) => qc.invalidateQueries({ queryKey: ["awd-rounds", compId] }),
  });
}

const CHECK_TONE: Record<string, TagTone> = { up: "success", down: "danger", error: "warning", timeout: "neutral" };

interface RoundRow extends Record<string, ReactNode> {
  number: ReactNode;
  status: ReactNode;
  started: ReactNode;
  ended: ReactNode;
  actions: ReactNode;
}

export default function AWDControl() {
  const { id } = useParams<{ id: string }>();
  const compId = Number(id);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: rounds, isLoading } = useRounds(compId);
  const [selectedRound, setSelectedRound] = useState<number>(0);
  const { data: results } = useRoundResults(compId, selectedRound);
  const { data: awdConfig } = useAWDConfig(compId);
  const updateConfig = useUpdateAWDConfig();
  const [configForm, setConfigForm] = useState<Partial<AWDConfig>>({});

  const deploy = useDeploy();
  const teardown = useTeardown();
  const executeRound = useExecuteRound();

  async function handleDeploy() {
    try {
      const r = await deploy.mutateAsync(compId);
      toast.success(`已部署 ${r.deployed} 个服务${r.failed > 0 ? `，${r.failed} 个失败` : ""}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "部署失败"); }
  }

  async function handleTeardown() {
    try {
      await teardown.mutateAsync(compId);
      toast.success("环境已拆除");
    } catch (e) { toast.error(e instanceof Error ? e.message : "拆除失败"); }
  }

  async function handleExecuteRound() {
    try {
      await executeRound.mutateAsync(compId);
      toast.success("轮次已执行");
    } catch (e) { toast.error(e instanceof Error ? e.message : "执行失败"); }
  }

  const roundColumns = [
    { key: "number" as const, header: "轮次", width: "10%" },
    { key: "status" as const, header: "状态", width: "15%" },
    { key: "started" as const, header: "开始", width: "25%" },
    { key: "ended" as const, header: "结束", width: "25%" },
    { key: "actions" as const, header: "", width: "15%", align: "right" as const },
  ];

  const roundRows: RoundRow[] = (rounds ?? []).map((r) => ({
    number: `#${r.round_number}`,
    status: <Tag tone={r.status === "completed" ? "success" : r.status === "running" ? "warning" : "neutral"}>{r.status}</Tag>,
    started: formatDate(r.started_at),
    ended: r.ended_at ? formatDate(r.ended_at) : "—",
    actions: (
      <Button size="sm" tone="outline" onClick={() => setSelectedRound(r.id)}>查看结果</Button>
    ),
  }));

  return (
    <PageShell
      title="AWD 赛事控制"
      description="管理 AWD 比赛的服务部署、轮次执行和 Checker 结果。"
      actions={
        <div className="yza-button-row">
          <Button tone="outline" onClick={() => navigate(`/competitions/${compId}`)}>返回</Button>
          <Button tone="primary" onClick={handleDeploy} disabled={deploy.isPending}>{deploy.isPending ? "部署中..." : "部署服务"}</Button>
          <Button tone="outline" onClick={handleExecuteRound} disabled={executeRound.isPending}>{executeRound.isPending ? "执行中..." : "执行轮次"}</Button>
          <Button tone="danger" onClick={handleTeardown} disabled={teardown.isPending}>拆除环境</Button>
        </div>
      }
    >
      <h3 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>轮次记录</h3>
      <section className="yza-doc-card stc-table-card">
        <div className="yza-doc-stack">
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>加载中...</div>
          ) : roundRows.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>暂无轮次，点击「执行轮次」开始。</div>
          ) : (
            <DataTable<RoundRow> columns={roundColumns} rows={roundRows} />
          )}
        </div>
      </section>

      {selectedRound > 0 && results && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Checker 结果（轮次 #{rounds?.find((r) => r.id === selectedRound)?.round_number}）</h3>
          <section className="yza-doc-card stc-table-card">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "0.5rem" }}>战队</th>
                  <th style={{ padding: "0.5rem" }}>题目</th>
                  <th style={{ padding: "0.5rem" }}>状态</th>
                  <th style={{ padding: "0.5rem" }}>详情</th>
                  <th style={{ padding: "0.5rem" }}>检测时间</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.5rem" }}>{r.team_name}</td>
                    <td style={{ padding: "0.5rem" }}>{r.challenge_name}</td>
                    <td style={{ padding: "0.5rem" }}><Tag tone={CHECK_TONE[r.status] ?? "neutral"}>{r.status.toUpperCase()}</Tag></td>
                    <td style={{ padding: "0.5rem", fontSize: "0.8rem", color: "#6b7280" }}>{r.detail}</td>
                    <td style={{ padding: "0.5rem", fontSize: "0.8rem" }}>{formatDate(r.checked_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        <h3 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>AWD 配置</h3>
        <section className="yza-doc-card" style={{ padding: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", maxWidth: 500 }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#6b7280" }}>轮次间隔（秒）</label>
              <input
                type="number"
                value={configForm.round_interval ?? awdConfig?.round_interval ?? 120}
                onChange={(e) => setConfigForm((p) => ({ ...p, round_interval: Number(e.target.value) }))}
                style={{ width: "100%", padding: "0.375rem 0.5rem", border: "1px solid #d1d5db", borderRadius: "0.25rem" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#6b7280" }}>攻击得分</label>
              <input
                type="number"
                value={configForm.attack_score ?? awdConfig?.attack_score ?? 50}
                onChange={(e) => setConfigForm((p) => ({ ...p, attack_score: Number(e.target.value) }))}
                style={{ width: "100%", padding: "0.375rem 0.5rem", border: "1px solid #d1d5db", borderRadius: "0.25rem" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#6b7280" }}>防御扣分</label>
              <input
                type="number"
                value={configForm.defense_score ?? awdConfig?.defense_score ?? -50}
                onChange={(e) => setConfigForm((p) => ({ ...p, defense_score: Number(e.target.value) }))}
                style={{ width: "100%", padding: "0.375rem 0.5rem", border: "1px solid #d1d5db", borderRadius: "0.25rem" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#6b7280" }}>可用性扣分</label>
              <input
                type="number"
                value={configForm.check_score ?? awdConfig?.check_score ?? -30}
                onChange={(e) => setConfigForm((p) => ({ ...p, check_score: Number(e.target.value) }))}
                style={{ width: "100%", padding: "0.375rem 0.5rem", border: "1px solid #d1d5db", borderRadius: "0.25rem" }}
              />
            </div>
          </div>
          <Button
            tone="primary"
            style={{ marginTop: "0.75rem" }}
            onClick={() => {
              void updateConfig.mutateAsync({ compId, ...configForm })
                .then(() => toast.success("配置已更新"))
                .catch(() => toast.error("更新失败"));
            }}
            disabled={updateConfig.isPending}
          >
            保存配置
          </Button>
        </section>
      </div>
    </PageShell>
  );
}
