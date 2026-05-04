import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Button,
  DataTable,
  EmptyTable,
  FilterBar,
  FilterSummary,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Tag,
  Textarea,
} from "@yza/ui";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from "@/hooks/useProjects";
import { useDataTable } from "@/hooks/useDataTable";
import { PageShell } from "@/components/PageShell";
import type { Project } from "@/types";

interface ProjectRow extends Record<string, ReactNode> {
  name: ReactNode;
  status: ReactNode;
  owner: ReactNode;
  created_at: ReactNode;
  actions: ReactNode;
}

const STATUS_TONE = {
  active: "success",
  archived: "neutral",
  draft: "warning",
} as const;

function toRow(
  project: Project,
  onEdit: () => void,
  onDelete: () => void,
  onView: () => void,
  canEdit: boolean,
  canDelete: boolean,
  t: (k: string, opts?: Record<string, unknown>) => string,
): ProjectRow {
  return {
    name: (
      <button className="stc-link" onClick={onView} type="button">
        {project.name}
      </button>
    ),
    status: <Tag tone={STATUS_TONE[project.status]}>{t(`projects.${project.status}`)}</Tag>,
    owner: project.owner_name,
    created_at: project.created_at.slice(0, 10),
    actions: (
      <div className="yza-button-row">
        {canEdit && (
          <Button size="sm" tone="outline" onClick={onEdit} aria-label={`${t("common.edit")} ${project.name}`}>{t("common.edit")}</Button>
        )}
        {canDelete && (
          <Button size="sm" tone="danger" onClick={onDelete} aria-label={`${t("common.delete")} ${project.name}`}>{t("common.delete")}</Button>
        )}
      </div>
    ),
  };
}

export default function Projects() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { can } = usePermission();
  const canCreate = can("project:create");
  const canEdit = can("project:update");
  const canDelete = can("project:delete");

  const table = useDataTable(10);
  const [statusFilter, setStatusFilter] = useState("");

  const {
    data,
    error,
    isLoading,
    refetch,
  } = useProjects({
    page: table.page,
    page_size: table.pageSize,
    search: table.debouncedSearch || undefined,
    status: statusFilter || undefined,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();

  const [form, setForm] = useState({ name: "", description: "", status: "draft" });
  const [formErrors, setFormErrors] = useState<{ name?: string }>({});

  function openCreate() {
    setForm({ name: "", description: "", status: "draft" });
    setFormErrors({});
    setCreateOpen(true);
  }

  function openEdit(project: Project) {
    setForm({ name: project.name, description: project.description, status: project.status });
    setFormErrors({});
    setEditTarget(project);
  }

  function resetFilters() {
    setStatusFilter("");
    table.setSearch("");
    table.reset();
  }

  function validateForm() {
    const errors: { name?: string } = {};
    if (!form.name.trim()) errors.name = t("projects.name") + " is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreate() {
    if (!validateForm()) return;
    try {
      await createMutation.mutateAsync(form);
      toast.success(t("projects.createTitle"));
      setCreateOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create project");
    }
  }

  async function handleUpdate() {
    if (!editTarget) return;
    if (!validateForm()) return;
    try {
      await updateMutation.mutateAsync({ id: editTarget.id, ...form });
      toast.success(t("projects.editTitle"));
      setEditTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update project");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t("projects.deleteTitle"));
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete project");
    }
  }

  const projects = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;
  const hasFilters = Boolean(table.search.trim() || statusFilter);

  const columns = [
    { key: "name" as const, header: t("projects.name"), width: "25%" },
    { key: "status" as const, header: t("projects.status"), width: "12%" },
    { key: "owner" as const, header: t("projects.owner"), width: "18%" },
    { key: "created_at" as const, header: t("projects.createdAt"), width: "15%" },
    { key: "actions" as const, header: t("common.actions"), width: "15%", align: "right" as const },
  ];

  const rows: ProjectRow[] = projects.map((project) =>
    toRow(
      project,
      () => openEdit(project),
      () => setDeleteTarget(project),
      () => navigate(`/projects/${project.id}`),
      canEdit,
      canDelete,
      t,
    ),
  );

  const summaryChips = [
    table.search.trim()
      ? <Tag key="search" tone="info">{`${t("common.search")}: ${table.search.trim()}`}</Tag>
      : null,
    statusFilter
      ? <Tag key="status" tone={STATUS_TONE[statusFilter as keyof typeof STATUS_TONE]}>{t(`projects.${statusFilter}`)}</Tag>
      : null,
  ].filter(Boolean);

  const errorMessage = error instanceof Error ? error.message : t("common.loadFailed");

  return (
    <PageShell
      title={t("projects.title")}
      description={t("projects.description")}
      actions={
        canCreate ? (
          <Button tone="primary" onClick={openCreate}>{t("projects.create")}</Button>
        ) : undefined
      }
    >
      <FilterBar
        actions={
          hasFilters ? (
            <Button size="sm" tone="outline" onClick={resetFilters}>
              {t("common.reset")}
            </Button>
          ) : undefined
        }
        controls={(
          <>
            <Input
              placeholder={t("projects.search")}
              value={table.search}
              onChange={(e) => table.setSearch(e.target.value)}
            />
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); table.reset(); }}
            >
              <option value="">{t("projects.allStatus")}</option>
              <option value="active">{t("projects.active")}</option>
              <option value="archived">{t("projects.archived")}</option>
              <option value="draft">{t("projects.draft")}</option>
            </Select>
          </>
        )}
      />

      {!isLoading && !error ? (
        <FilterSummary
          chips={summaryChips.length > 0 ? <span className="stc-tag-list">{summaryChips}</span> : undefined}
          summary={hasFilters ? t("common.filteredCount", { count: total }) : t("common.totalCount", { count: total })}
        />
      ) : null}

      <section className="yza-doc-card">
        <div className="yza-doc-stack">
          {isLoading ? (
            <>
              <Skeleton variant="rect" height={44} />
              <Skeleton count={5} variant="rect" height={52} />
            </>
          ) : error ? (
            <>
              <Alert
                heading={t("common.loadFailed")}
                description={errorMessage}
                tone="danger"
              />
              <div>
                <Button tone="outline" onClick={() => { void refetch(); }}>
                  {t("common.retry")}
                </Button>
              </div>
            </>
          ) : rows.length === 0 ? (
            <EmptyTable
              action={(
                <Button tone="outline" onClick={hasFilters ? resetFilters : openCreate} disabled={!hasFilters && !canCreate}>
                  {hasFilters ? t("common.reset") : t("projects.create")}
                </Button>
              )}
              description={hasFilters ? t("common.emptyFiltered") : t("projects.emptyDescription")}
              headers={columns.map((column) => column.header)}
              heading={hasFilters ? t("common.noData") : t("projects.emptyTitle")}
            />
          ) : (
            <>
              <DataTable<ProjectRow> columns={columns} rows={rows} />
              {totalPages > 1 && (
                <Pagination
                  page={table.page}
                  totalPages={totalPages}
                  onPageChange={table.setPage}
                />
              )}
            </>
          )}
        </div>
      </section>

      <Modal
        open={createOpen}
        title={t("projects.createTitle")}
        onClose={() => setCreateOpen(false)}
        footer={
          <div className="yza-button-row">
            <Button tone="outline" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
            <Button tone="primary" onClick={handleCreate} disabled={createMutation.isPending} aria-busy={createMutation.isPending}>
              {t("common.create")}
            </Button>
          </div>
        }
      >
        <div className="yza-doc-stack">
          <Input label={t("projects.name")} value={form.name} status={formErrors.name ? "error" : "default"} message={formErrors.name} onChange={(e) => { setForm((current) => ({ ...current, name: e.target.value })); setFormErrors((current) => ({ ...current, name: undefined })); }} />
          <Textarea label={t("projects.description")} value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} rows={3} />
          <Select label={t("projects.status")} value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}>
            <option value="draft">{t("projects.draft")}</option>
            <option value="active">{t("projects.active")}</option>
            <option value="archived">{t("projects.archived")}</option>
          </Select>
        </div>
      </Modal>

      <Modal
        open={editTarget !== null}
        title={t("projects.editTitle")}
        onClose={() => setEditTarget(null)}
        footer={
          <div className="yza-button-row">
            <Button tone="outline" onClick={() => setEditTarget(null)}>{t("common.cancel")}</Button>
            <Button tone="primary" onClick={handleUpdate} disabled={updateMutation.isPending} aria-busy={updateMutation.isPending}>
              {t("common.save")}
            </Button>
          </div>
        }
      >
        <div className="yza-doc-stack">
          <Input label={t("projects.name")} value={form.name} status={formErrors.name ? "error" : "default"} message={formErrors.name} onChange={(e) => { setForm((current) => ({ ...current, name: e.target.value })); setFormErrors((current) => ({ ...current, name: undefined })); }} />
          <Textarea label={t("projects.description")} value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} rows={3} />
          <Select label={t("projects.status")} value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}>
            <option value="draft">{t("projects.draft")}</option>
            <option value="active">{t("projects.active")}</option>
            <option value="archived">{t("projects.archived")}</option>
          </Select>
        </div>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        title={t("projects.deleteTitle")}
        description={t("projects.deleteConfirm", { name: deleteTarget?.name })}
        onClose={() => setDeleteTarget(null)}
        footer={
          <div className="yza-button-row">
            <Button tone="outline" onClick={() => setDeleteTarget(null)}>{t("common.cancel")}</Button>
            <Button tone="danger" onClick={handleDelete} disabled={deleteMutation.isPending} aria-busy={deleteMutation.isPending}>
              {t("common.delete")}
            </Button>
          </div>
        }
      />
    </PageShell>
  );
}
