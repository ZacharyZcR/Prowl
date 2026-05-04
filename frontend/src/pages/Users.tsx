import { useEffect, useRef, useState, type ReactNode } from "react";
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
} from "@yza/ui";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@/hooks/useUsers";
import { useAllRoles } from "@/hooks/useRoles";
import { useDataTable } from "@/hooks/useDataTable";
import { usePageBounds } from "@/hooks/usePageBounds";
import { PageShell } from "@/components/PageShell";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/datetime";
import type { User } from "@/types";

interface UserRow extends Record<string, ReactNode> {
  select: ReactNode;
  username: ReactNode;
  email: ReactNode;
  nickname: ReactNode;
  role: ReactNode;
  created_at: ReactNode;
  actions: ReactNode;
}

function toRow(
  user: User,
  onEdit: () => void,
  onDelete: () => void,
  canEdit: boolean,
  canDelete: boolean,
  t: (k: string, opts?: Record<string, unknown>) => string,
  selected: boolean,
  onToggleSelect: () => void,
): UserRow {
  return {
    select: (
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelect}
        aria-label={`${t("common.select")} ${user.username}`}
      />
    ),
    username: user.username,
    email: user.email,
    nickname: user.nickname,
    role: user.role ? <Tag tone="info">{user.role.name}</Tag> : <Tag tone="neutral">-</Tag>,
    created_at: formatDate(user.created_at),
    actions: (
      <div className="yza-button-row">
        {canEdit && (
          <Button size="sm" tone="outline" onClick={onEdit} aria-label={`${t("common.edit")} ${user.username}`}>{t("common.edit")}</Button>
        )}
        {canDelete && (
          <Button size="sm" tone="danger" onClick={onDelete} aria-label={`${t("common.delete")} ${user.username}`}>{t("common.delete")}</Button>
        )}
      </div>
    ),
  };
}

export default function Users() {
  const { t } = useTranslation();
  const { can } = usePermission();
  const canCreate = can("user:create");
  const canEdit = can("user:update");
  const canDelete = can("user:delete");

  const table = useDataTable(10);
  const {
    data,
    error,
    isLoading,
    refetch,
  } = useUsers({
    page: table.page,
    page_size: table.pageSize,
    search: table.debouncedSearch,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const rolesQuery = useAllRoles(createOpen || editTarget !== null);

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ username: "", password: "", email: "", nickname: "", role_id: "" });
  const [formErrors, setFormErrors] = useState<{ username?: string; password?: string }>({});

  function openCreate() {
    setForm({ username: "", password: "", email: "", nickname: "", role_id: "" });
    setFormErrors({});
    setCreateOpen(true);
  }

  function openEdit(user: User) {
    setForm({
      username: user.username,
      password: "",
      email: user.email,
      nickname: user.nickname,
      role_id: user.role?.id?.toString() ?? "",
    });
    setFormErrors({});
    setEditTarget(user);
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
      await api.post("/api/v1/data/async-export/users");
      toast.info(t("data.exportStarted"));
    } catch {
      toast.error(t("data.exportFailed"));
    }
  }

  async function handleImport(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.post("/api/v1/data/async-import/users", formData, {
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
      await Promise.all(Array.from(selected).map((id) => deleteMutation.mutateAsync(id)));
      toast.success(t("common.delete"));
      setSelected(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  function resetFilters() {
    table.setSearch("");
    table.reset();
  }

  useEffect(() => {
    setSelected(new Set());
  }, [table.page, table.debouncedSearch]);

  function validateCreate() {
    const errors: { username?: string; password?: string } = {};
    if (!form.username.trim()) errors.username = t("login.usernameRequired");
    if (!form.password.trim()) errors.password = t("login.passwordRequired");
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreate() {
    if (!validateCreate()) return;
    try {
      await createMutation.mutateAsync({
        username: form.username,
        password: form.password,
        email: form.email,
        nickname: form.nickname,
        role_id: form.role_id ? Number(form.role_id) : undefined,
      });
      toast.success(t("users.createTitle"));
      setCreateOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  async function handleUpdate() {
    if (!editTarget) return;
    try {
      await updateMutation.mutateAsync({
        id: editTarget.id,
        email: form.email,
        nickname: form.nickname,
        role_id: form.role_id ? Number(form.role_id) : undefined,
      });
      toast.success(t("users.editTitle"));
      setEditTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t("users.deleteTitle"));
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  const users = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;
  const hasFilters = Boolean(table.search.trim());
  usePageBounds(table.page, totalPages, table.setPage);

  const columns = [
    { key: "select" as const, header: "", width: "4%" },
    { key: "username" as const, header: t("users.username"), width: "14%" },
    { key: "email" as const, header: t("users.email"), width: "20%" },
    { key: "nickname" as const, header: t("users.nickname"), width: "14%" },
    { key: "role" as const, header: t("users.role"), width: "12%" },
    { key: "created_at" as const, header: t("users.createdAt"), width: "12%" },
    { key: "actions" as const, header: t("common.actions"), width: "14%", align: "right" as const },
  ];

  const rows: UserRow[] = users.map((user) =>
    toRow(user, () => openEdit(user), () => setDeleteTarget(user), canEdit, canDelete, t, selected.has(user.id), () => toggleSelect(user.id)),
  );

  const roles = rolesQuery.data?.items ?? [];
  const errorMessage = error instanceof Error ? error.message : t("common.loadFailed");

  return (
    <PageShell
      title={t("users.title")}
      description={t("users.description")}
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
            <Button tone="primary" onClick={openCreate}>{t("users.create")}</Button>
          )}
        </div>
      }
    >
      {selected.size > 0 && canDelete && (
        <div className="yza-button-row stc-table-bulk-actions">
          <Tag tone="info">{selected.size} {t("common.results")}</Tag>
          <Button size="sm" tone="danger" onClick={() => { void handleBulkDelete(); }} disabled={deleteMutation.isPending}>
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
          <Input
            placeholder={t("users.search")}
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
          />
        )}
      />

      {!isLoading && !error ? (
        <div className="stc-table-summary">
          <FilterSummary
            chips={hasFilters ? <Tag tone="info">{`${t("common.search")}: ${table.search.trim()}`}</Tag> : undefined}
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
              <Alert heading={t("common.loadFailed")} description={errorMessage} tone="danger" />
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
                  {hasFilters ? t("common.reset") : t("users.create")}
                </Button>
              )}
              description={hasFilters ? t("common.emptyFiltered") : t("users.emptyDescription")}
              headers={columns.map((column) => column.header)}
              heading={hasFilters ? t("common.noData") : t("users.emptyTitle")}
            />
          ) : (
            <>
              <DataTable<UserRow> columns={columns} rows={rows} />
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
        title={t("users.createTitle")}
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
          <Input label={t("users.username")} value={form.username} status={formErrors.username ? "error" : "default"} message={formErrors.username} onChange={(e) => { setForm((current) => ({ ...current, username: e.target.value })); setFormErrors((current) => ({ ...current, username: undefined })); }} />
          <Input label={t("users.password")} type="password" value={form.password} status={formErrors.password ? "error" : "default"} message={formErrors.password} onChange={(e) => { setForm((current) => ({ ...current, password: e.target.value })); setFormErrors((current) => ({ ...current, password: undefined })); }} />
          <Input label={t("users.email")} type="email" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} />
          <Input label={t("users.nickname")} value={form.nickname} onChange={(e) => setForm((current) => ({ ...current, nickname: e.target.value }))} />
          <Select label={t("users.role")} value={form.role_id} onChange={(e) => setForm((current) => ({ ...current, role_id: e.target.value }))}>
            <option value="">{t("users.noRole")}</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </Select>
        </div>
      </Modal>

      <Modal
        open={editTarget !== null}
        title={t("users.editTitle")}
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
          <Input label={t("users.username")} value={form.username} disabled />
          <Input label={t("users.email")} type="email" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} />
          <Input label={t("users.nickname")} value={form.nickname} onChange={(e) => setForm((current) => ({ ...current, nickname: e.target.value }))} />
          <Select label={t("users.role")} value={form.role_id} onChange={(e) => setForm((current) => ({ ...current, role_id: e.target.value }))}>
            <option value="">{t("users.noRole")}</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </Select>
        </div>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        title={t("users.deleteTitle")}
        description={t("users.deleteConfirm", { name: deleteTarget?.username })}
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
