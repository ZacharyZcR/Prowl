import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, DataTable, FilterBar, Input, Pagination, Select, Skeleton, Tag } from "@yza/ui";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDataTable } from "@/hooks/useDataTable";
import { usePageBounds } from "@/hooks/usePageBounds";
import { PageShell } from "@/components/PageShell";
import { formatDate } from "@/lib/datetime";

interface InstanceStats {
  total_instances: number;
  running_instances: number;
  pending_instances: number;
  stopped_instances: number;
  error_instances: number;
  stack_instances: number;
}

interface Instance {
  id: number;
  challenge_id: number;
  challenge_name: string;
  competition_id: number;
  team_id: number;
  team_name: string;
  container_id: string;
  stack_id?: string;
  containers?: Record<string, string>;
  networks?: Record<string, string>;
  status: string;
  access_url: string;
  expires_at: string;
  created_at: string;
}

interface InstanceList {
  items: Instance[];
  total: number;
  total_pages: number;
}

type TagTone = "info" | "success" | "warning" | "neutral" | "danger";
const STATUS_TONE: Record<string, TagTone> = {
  running: "success", starting: "warning", pending: "neutral",
  stopping: "warning", stopped: "neutral", error: "danger",
};

function useInstanceStats() {
  return useQuery({
    queryKey: ["instance-stats"],
    queryFn: () => api.get<InstanceStats>("/api/v1/admin/instances/stats").then((r) => r.data),
    refetchInterval: 10_000,
  });
}

function useInstances(query: { page?: number; page_size?: number; status?: string }) {
  return useQuery({
    queryKey: ["instances", query],
    queryFn: () => api.get<InstanceList>("/api/v1/admin/instances", { params: query }).then((r) => r.data),
  });
}

function useForceRemove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/admin/instances/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instances"] });
      qc.invalidateQueries({ queryKey: ["instance-stats"] });
    },
  });
}

function useRenewInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.put(`/api/v1/admin/docker/instances/${id}/renew?seconds=3600`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["instances"] }),
  });
}

function useBatchCleanup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ cleaned: number }>("/api/v1/admin/docker/instances/cleanup").then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instances"] });
      qc.invalidateQueries({ queryKey: ["instance-stats"] });
    },
  });
}

interface InstanceRow extends Record<string, ReactNode> {
  challenge: ReactNode;
  team: ReactNode;
  status: ReactNode;
  runtime: ReactNode;
  access: ReactNode;
  expires: ReactNode;
  actions: ReactNode;
}

function instanceRuntime(inst: Instance) {
  if (!inst.stack_id) {
    return <Tag tone="neutral">single</Tag>;
  }
  return (
    <div style={{ display: "grid", gap: "0.25rem" }}>
      <Tag tone="info">stack</Tag>
      <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
        {Object.keys(inst.containers ?? {}).length} 服务 / {Object.keys(inst.networks ?? {}).length} 网络
      </span>
    </div>
  );
}

export default function ContainerMonitor() {
  const { t } = useTranslation();
  const { data: stats } = useInstanceStats();
  const table = useDataTable(10);
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, error, refetch } = useInstances({
    page: table.page,
    page_size: table.pageSize,
    status: statusFilter || undefined,
  });

  const forceRemove = useForceRemove();
  const renew = useRenewInstance();
  const cleanup = useBatchCleanup();

  async function handleCleanup() {
    try {
      const result = await cleanup.mutateAsync();
      toast.success(`清理了 ${result.cleaned} 个过期容器`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "清理失败");
    }
  }

  const totalPages = data?.total_pages ?? 1;
  usePageBounds(table.page, totalPages, table.setPage);

  const columns = [
    { key: "challenge" as const, header: "题目", width: "18%" },
    { key: "team" as const, header: "战队", width: "15%" },
    { key: "status" as const, header: "状态", width: "10%" },
    { key: "runtime" as const, header: "运行形态", width: "12%" },
    { key: "access" as const, header: "访问地址", width: "18%" },
    { key: "expires" as const, header: "过期时间", width: "15%" },
    { key: "actions" as const, header: t("common.actions"), width: "12%", align: "right" as const },
  ];

  const rows: InstanceRow[] = (data?.items ?? []).map((inst) => ({
    challenge: inst.challenge_name || `#${inst.challenge_id}`,
    team: inst.team_name || `#${inst.team_id}`,
    status: <Tag tone={STATUS_TONE[inst.status] ?? "neutral"}>{inst.status}</Tag>,
    runtime: instanceRuntime(inst),
    access: inst.access_url ? (
      <a href={inst.access_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem", color: "#3b82f6", wordBreak: "break-all" }}>
        {inst.access_url}
      </a>
    ) : "—",
    expires: formatDate(inst.expires_at),
    actions: (
      <div className="yza-button-row">
        {inst.status === "running" && (
          <Button size="sm" tone="outline" onClick={() => { void renew.mutateAsync(inst.id).then(() => toast.success("已续期 1 小时")).catch(() => toast.error("续期失败")); }}>
            续期
          </Button>
        )}
        <Button size="sm" tone="danger" onClick={() => { void forceRemove.mutateAsync(inst.id).then(() => toast.success("已销毁")).catch(() => toast.error("销毁失败")); }}>
          销毁
        </Button>
      </div>
    ),
  }));

  return (
    <PageShell
      title="容器监控"
      description="查看和管理所有运行中的题目容器实例。"
      actions={<Button tone="outline" onClick={handleCleanup} disabled={cleanup.isPending}>{cleanup.isPending ? "清理中..." : "清理过期容器"}</Button>}
    >
      {stats && (
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          {[
            { label: "总计", value: stats.total_instances, tone: "neutral" as TagTone },
            { label: "运行中", value: stats.running_instances, tone: "success" as TagTone },
            { label: "排队中", value: stats.pending_instances, tone: "info" as TagTone },
            { label: "已停止", value: stats.stopped_instances, tone: "neutral" as TagTone },
            { label: "异常", value: stats.error_instances, tone: "danger" as TagTone },
            { label: "Stack", value: stats.stack_instances, tone: "info" as TagTone },
          ].map((s) => (
            <div key={s.label} style={{ padding: "0.75rem 1.25rem", border: "1px solid #e5e7eb", borderRadius: "0.5rem", textAlign: "center", minWidth: 100 }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{s.value}</div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <FilterBar controls={
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); table.reset(); }}>
          <option value="">全部状态</option>
          <option value="running">运行中</option>
          <option value="starting">启动中</option>
          <option value="stopped">已停止</option>
          <option value="error">异常</option>
        </Select>
      } />

      <section className="yza-doc-card stc-table-card">
        <div className="yza-doc-stack">
          {isLoading ? (
            <><Skeleton variant="rect" height={44} /><Skeleton count={5} variant="rect" height={52} /></>
          ) : error ? (
            <><Alert heading={t("common.loadFailed")} description="加载失败" tone="danger" /><div><Button tone="outline" onClick={() => { void refetch(); }}>{t("common.retry")}</Button></div></>
          ) : rows.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>暂无容器实例</div>
          ) : (
            <>
              <DataTable<InstanceRow> columns={columns} rows={rows} />
              {totalPages > 1 && <Pagination page={table.page} totalPages={totalPages} onPageChange={table.setPage} />}
            </>
          )}
        </div>
      </section>
    </PageShell>
  );
}
