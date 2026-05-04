import { useEffect, useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
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
} from "@yza/ui";
import { toast } from "sonner";
import { ProjectFormFields } from "@/components/projects/ProjectFormFields";
import { usePermission } from "@/hooks/usePermission";
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject, useBulkDeleteProjects } from "@/hooks/useProjects";
import { useDataTable } from "@/hooks/useDataTable";
import { usePageBounds } from "@/hooks/usePageBounds";
import { PageShell } from "@/components/PageShell";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/datetime";
import { PROJECT_STATUS_TONE, createEmptyProjectForm, projectFormSchema, toProjectForm, type ProjectForm } from "@/lib/projects";
import type { Project } from "@/types";

interface ProjectRow extends Record<string, ReactNode> {
  select: ReactNode;
  name: ReactNode;
  status: ReactNode;
  owner: ReactNode;
  created_at: ReactNode;
  actions: ReactNode;
}

function toRow(
  project: Project,
  onEdit: () => void,
  onDelete: () => void,
  onView: () => void,
  canEdit: boolean,
  canDelete: boolean,
  t: (k: string, opts?: Record<string, unknown>) => string,
  selected: boolean,
  onToggleSelect: () => void,
): ProjectRow {
  return {
    select: (
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelect}
        aria-label={`${t("common.select")} ${project.name}`}
      />
    ),
    name: (
      <button className="stc-link" onClick={onView} type="button">
        {project.name}
      </button>
    ),
    status: <Tag tone={PROJECT_STATUS_TONE[project.status]}>{t(`projects.${project.status}`)}</Tag>,
    owner: project.owner_name,
    created_at: formatDate(project.created_at),
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
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const bulkDeleteMutation = useBulkDeleteProjects();
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<ProjectForm>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: createEmptyProjectForm(),
  });

  function openCreate() {
    reset(createEmptyProjectForm());
    setCreateOpen(true);
  }

  function openEdit(project: Project) {
    reset(toProjectForm(project));
    setEditTarget(project);
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleExport() {
    try {
      await api.post("/api/v1/data/async-export/projects");
      toast.info(t("data.exportStarted"));
    } catch {
      toast.error(t("data.exportFailed"));
    }
  }

  async function handleImport(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.post("/api/v1/data/async-import/projects", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.info(t("data.importStarted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("data.importFailed"));
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    try {
      const result = await bulkDeleteMutation.mutateAsync(Array.from(selected));
      if (result.errors && result.errors.length > 0) {
        toast.error(result.errors.join("; "));
      } else {
        toast.success(t("common.delete"));
      }
      setSelected(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  function resetFilters() {
    setStatusFilter("");
    table.setSearch("");
    table.reset();
  }

  useEffect(() => {
    setSelected(new Set());
  }, [table.page, table.debouncedSearch, statusFilter]);

  const handleCreate = handleSubmit(async (form) => {
    try {
      await createMutation.mutateAsync(form);
      toast.success(t("projects.createTitle"));
      setCreateOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  });

  const handleUpdate = handleSubmit(async (form) => {
    if (!editTarget) return;
    try {
      await updateMutation.mutateAsync({ id: editTarget.id, ...form });
      toast.success(t("projects.editTitle"));
      setEditTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t("projects.deleteTitle"));
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  const projects = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;
  const hasFilters = Boolean(table.search.trim() || statusFilter);
  usePageBounds(table.page, totalPages, table.setPage);

  const columns = [
    { key: "select" as const, header: "", width: "4%" },
    { key: "name" as const, header: t("projects.name"), width: "22%" },
    { key: "status" as const, header: t("projects.status"), width: "12%" },
    { key: "owner" as const, header: t("projects.owner"), width: "16%" },
    { key: "created_at" as const, header: t("projects.createdAt"), width: "14%" },
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
      selected.has(project.id),
      () => toggleSelect(project.id),
    ),
  );

  const summaryChips = [
    table.search.trim()
      ? <Tag key="search" tone="info">{`${t("common.search")}: ${table.search.trim()}`}</Tag>
      : null,
    statusFilter
      ? <Tag key="status" tone={PROJECT_STATUS_TONE[statusFilter as keyof typeof PROJECT_STATUS_TONE]}>{t(`projects.${statusFilter}`)}</Tag>
      : null,
  ].filter(Boolean);

  const errorMessage = error instanceof Error ? error.message : t("common.loadFailed");
  const { ref: _nameRef, ...nameField } = register("name");
  const { ref: _descriptionRef, ...descriptionField } = register("description");
  const { ref: _statusRef, ...statusField } = register("status");

  return (
    <PageShell
      title={t("projects.title")}
      description={t("projects.description")}
      actions={
        <div className="yza-button-row stc-page-actions">
          <Button tone="outline" onClick={() => { void handleExport(); }}>{t("data.export")}</Button>
          <Button tone="outline" onClick={() => fileInputRef.current?.click()}>{t("data.import")}</Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) { void handleImport(file); }
              e.target.value = "";
            }}
          />
          {canCreate && (
            <Button tone="primary" onClick={openCreate}>{t("projects.create")}</Button>
          )}
        </div>
      }
    >
      {selected.size > 0 && canDelete && (
        <div className="yza-button-row stc-table-bulk-actions">
          <Tag tone="info">{selected.size} {t("common.results")}</Tag>
          <Button size="sm" tone="danger" onClick={() => { void handleBulkDelete(); }} disabled={bulkDeleteMutation.isPending}>
            {t("common.delete")} {selected.size}
          </Button>
        </div>
      )}

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
        <div className="stc-table-summary">
          <FilterSummary
            chips={summaryChips.length > 0 ? <span className="stc-tag-list">{summaryChips}</span> : undefined}
            summary={hasFilters ? t("common.filteredCount", { count: total }) : t("common.totalCount", { count: total })}
          />
        </div>
      ) : null}

      <section className="yza-doc-card stc-table-card">
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
            <Button tone="primary" onClick={() => { void handleCreate(); }} disabled={createMutation.isPending} aria-busy={createMutation.isPending}>
              {t("common.create")}
            </Button>
          </div>
        }
      >
        <ProjectFormFields
          descriptionField={descriptionField}
          formErrors={{
            description: errors.description?.message,
            name: errors.name?.message,
            status: errors.status?.message,
          }}
          nameField={nameField}
          statusField={statusField}
          t={t}
        />
      </Modal>

      <Modal
        open={editTarget !== null}
        title={t("projects.editTitle")}
        onClose={() => setEditTarget(null)}
        footer={
          <div className="yza-button-row">
            <Button tone="outline" onClick={() => setEditTarget(null)}>{t("common.cancel")}</Button>
            <Button tone="primary" onClick={() => { void handleUpdate(); }} disabled={updateMutation.isPending} aria-busy={updateMutation.isPending}>
              {t("common.save")}
            </Button>
          </div>
        }
      >
        <ProjectFormFields
          descriptionField={descriptionField}
          formErrors={{
            description: errors.description?.message,
            name: errors.name?.message,
            status: errors.status?.message,
          }}
          nameField={nameField}
          statusField={statusField}
          t={t}
        />
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
