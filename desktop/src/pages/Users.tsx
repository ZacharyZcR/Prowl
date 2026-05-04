import { useState, type ReactNode } from "react";
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
import { PageShell } from "@/components/PageShell";
import type { User } from "@/types";

interface UserRow extends Record<string, ReactNode> {
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
): UserRow {
  return {
    username: user.username,
    email: user.email,
    nickname: user.nickname,
    role: user.role ? <Tag tone="info">{user.role.name}</Tag> : <Tag tone="neutral">-</Tag>,
    created_at: user.created_at.slice(0, 10),
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
  const rolesQuery = useAllRoles();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

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

  function resetFilters() {
    table.setSearch("");
    table.reset();
  }

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
      toast.error(e instanceof Error ? e.message : "Failed to create user");
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
      toast.error(e instanceof Error ? e.message : "Failed to update user");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t("users.deleteTitle"));
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete user");
    }
  }

  const users = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;
  const hasFilters = Boolean(table.search.trim());

  const columns = [
    { key: "username" as const, header: t("users.username"), width: "15%" },
    { key: "email" as const, header: t("users.email"), width: "22%" },
    { key: "nickname" as const, header: t("users.nickname"), width: "15%" },
    { key: "role" as const, header: t("users.role"), width: "12%" },
    { key: "created_at" as const, header: t("users.createdAt"), width: "12%" },
    { key: "actions" as const, header: t("common.actions"), width: "14%", align: "right" as const },
  ];

  const rows: UserRow[] = users.map((user) =>
    toRow(user, () => openEdit(user), () => setDeleteTarget(user), canEdit, canDelete, t),
  );

  const roles = rolesQuery.data?.items ?? [];
  const errorMessage = error instanceof Error ? error.message : t("common.loadFailed");

  return (
    <PageShell
      title={t("users.title")}
      description={t("users.description")}
      actions={
        canCreate ? (
          <Button tone="primary" onClick={openCreate}>{t("users.create")}</Button>
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
          <Input
            placeholder={t("users.search")}
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
          />
        )}
      />

      {!isLoading && !error ? (
        <FilterSummary
          chips={hasFilters ? <Tag tone="info">{`${t("common.search")}: ${table.search.trim()}`}</Tag> : undefined}
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
