import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Button,
  DataTable,
  EmptyTable,
  FilterBar,
  Input,
  Modal,
  Pagination,
  Skeleton,
  Tag,
} from "@yza/ui";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { useDataTable } from "@/hooks/useDataTable";
import { usePageBounds } from "@/hooks/usePageBounds";
import { PageShell } from "@/components/PageShell";
import { formatDate } from "@/lib/datetime";

interface Scenario {
  id: number;
  name: string;
  description: string;
  difficulty: string;
  estimated_duration: number;
  tags: string[];
  creator_name: string;
  created_at: string;
}

function useScenarios(query: { page?: number; page_size?: number; search?: string }) {
  return useQuery({
    queryKey: ["scenarios", query],
    queryFn: () => api.get("/api/v1/scenarios", { params: query }).then((r) => r.data as { items: Scenario[]; total: number; total_pages: number }),
  });
}

function useCreateScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description: string; difficulty: string; estimated_duration: number }) =>
      api.post("/api/v1/scenarios", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scenarios"] }),
  });
}

function useDeleteScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/scenarios/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scenarios"] }),
  });
}

interface ScenarioRow extends Record<string, ReactNode> {
  name: ReactNode;
  difficulty: ReactNode;
  duration: ReactNode;
  creator: ReactNode;
  created_at: ReactNode;
  actions: ReactNode;
}

export default function Scenarios() {
  const { t } = useTranslation();
  const { can } = usePermission();
  const canCreate = can("competition:create");
  const canDelete = can("competition:delete");

  const table = useDataTable(10);
  const { data, error, isLoading, refetch } = useScenarios({
    page: table.page,
    page_size: table.pageSize,
    search: table.debouncedSearch || undefined,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Scenario | null>(null);
  const [form, setForm] = useState({ name: "", description: "", difficulty: "medium", estimated_duration: 3600 });

  const createMutation = useCreateScenario();
  const deleteMutation = useDeleteScenario();

  async function handleCreate() {
    try {
      await createMutation.mutateAsync(form);
      toast.success(t("common.create"));
      setCreateOpen(false);
      setForm({ name: "", description: "", difficulty: "medium", estimated_duration: 3600 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t("common.delete"));
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  const scenarios = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;
  usePageBounds(table.page, totalPages, table.setPage);

  const columns = [
    { key: "name" as const, header: t("scenarios.name"), width: "25%" },
    { key: "difficulty" as const, header: t("scenarios.difficulty"), width: "12%" },
    { key: "duration" as const, header: t("scenarios.duration"), width: "12%" },
    { key: "creator" as const, header: t("scenarios.creator"), width: "15%" },
    { key: "created_at" as const, header: t("common.createdAt"), width: "15%" },
    { key: "actions" as const, header: t("common.actions"), width: "12%", align: "right" as const },
  ];

  const rows: ScenarioRow[] = scenarios.map((s) => ({
    name: s.name,
    difficulty: <Tag tone="info">{s.difficulty}</Tag>,
    duration: `${Math.round(s.estimated_duration / 60)} min`,
    creator: s.creator_name,
    created_at: formatDate(s.created_at),
    actions: (
      <div className="yza-button-row">
        {canDelete && (
          <Button size="sm" tone="danger" onClick={() => setDeleteTarget(s)}>{t("common.delete")}</Button>
        )}
      </div>
    ),
  }));

  const errorMessage = error instanceof Error ? error.message : t("common.loadFailed");

  return (
    <PageShell
      title={t("scenarios.pageTitle")}
      description={t("scenarios.pageDescription")}
      actions={canCreate ? <Button tone="primary" onClick={() => setCreateOpen(true)}>{t("scenarios.create")}</Button> : undefined}
    >
      <FilterBar controls={<Input placeholder={t("scenarios.search")} value={table.search} onChange={(e) => table.setSearch(e.target.value)} />} />

      <section className="yza-doc-card stc-table-card">
        <div className="yza-doc-stack">
          {isLoading ? (
            <><Skeleton variant="rect" height={44} /><Skeleton count={3} variant="rect" height={52} /></>
          ) : error ? (
            <><Alert heading={t("common.loadFailed")} description={errorMessage} tone="danger" /><div><Button tone="outline" onClick={() => { void refetch(); }}>{t("common.retry")}</Button></div></>
          ) : rows.length === 0 ? (
            <EmptyTable headers={columns.map((c) => c.header)} heading={t("scenarios.emptyTitle")} description={t("scenarios.emptyDescription")} action={canCreate ? <Button tone="outline" onClick={() => setCreateOpen(true)}>{t("scenarios.create")}</Button> : undefined} />
          ) : (
            <><DataTable<ScenarioRow> columns={columns} rows={rows} />{totalPages > 1 && <Pagination page={table.page} totalPages={totalPages} onPageChange={table.setPage} />}</>
          )}
        </div>
      </section>

      <Modal open={createOpen} title={t("scenarios.create")} onClose={() => setCreateOpen(false)}
        footer={<div className="yza-button-row"><Button tone="outline" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button><Button tone="primary" onClick={() => { void handleCreate(); }} disabled={createMutation.isPending}>{t("common.create")}</Button></div>}
      >
        <div className="yza-doc-stack">
          <Input label={t("scenarios.name")} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <div><label className="yza-label">{t("scenarios.description")}</label><textarea className="yza-textarea" rows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
          <Input label={t("scenarios.duration")} type="number" value={String(form.estimated_duration / 60)} onChange={(e) => setForm((p) => ({ ...p, estimated_duration: Number(e.target.value) * 60 }))} />
        </div>
      </Modal>

      <Modal open={deleteTarget !== null} title={t("scenarios.deleteTitle")} description={t("scenarios.deleteConfirm", { name: deleteTarget?.name })} onClose={() => setDeleteTarget(null)}
        footer={<div className="yza-button-row"><Button tone="outline" onClick={() => setDeleteTarget(null)}>{t("common.cancel")}</Button><Button tone="danger" onClick={() => { void handleDelete(); }} disabled={deleteMutation.isPending}>{t("common.delete")}</Button></div>}
      />
    </PageShell>
  );
}
