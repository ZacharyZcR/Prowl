import { useCallback, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Button,
  Checkbox,
  DataTable,
  EmptyTable,
  FilterBar,
  FilterSummary,
  Input,
  Modal,
  Pagination,
  Skeleton,
  Tag,
} from "@yza/ui";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { usePermissionCategories } from "@/hooks/usePermissions";
import { useRoles, useCreateRole, useUpdateRole, useDeleteRole } from "@/hooks/useRoles";
import { useDataTable } from "@/hooks/useDataTable";
import { usePageBounds } from "@/hooks/usePageBounds";
import { PageShell } from "@/components/PageShell";
import type { Role, PermissionCategory } from "@/types";

interface RoleRow extends Record<string, ReactNode> {
  name: ReactNode;
  description: ReactNode;
  permissions: ReactNode;
  user_count: ReactNode;
  actions: ReactNode;
}

function toRow(
  role: Role,
  onEdit: () => void,
  onDelete: () => void,
  canEdit: boolean,
  canDelete: boolean,
  t: (k: string, opts?: Record<string, unknown>) => string,
): RoleRow {
  return {
    name: role.name,
    description: role.description,
    permissions: (
      <span className="stc-tag-list">
        {role.permissions.slice(0, 4).map((permission) => (
          <Tag key={permission} tone="info">{permission}</Tag>
        ))}
        {role.permissions.length > 4 && (
          <Tag tone="neutral">+{role.permissions.length - 4}</Tag>
        )}
      </span>
    ),
    user_count: String(role.user_count),
    actions: (
      <div className="yza-button-row">
        {canEdit && (
          <Button size="sm" tone="outline" onClick={onEdit} aria-label={`${t("common.edit")} ${role.name}`}>{t("common.edit")}</Button>
        )}
        {canDelete && (
          <Button size="sm" tone="danger" onClick={onDelete} aria-label={`${t("common.delete")} ${role.name}`}>{t("common.delete")}</Button>
        )}
      </div>
    ),
  };
}

function IndeterminateCheckbox({
  indeterminate,
  ...props
}: { indeterminate?: boolean } & React.ComponentProps<typeof Checkbox>) {
  const wrapRef = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      const input = el.querySelector<HTMLInputElement>("input[type=checkbox]");
      if (input) input.indeterminate = indeterminate ?? false;
    },
    [indeterminate],
  );
  return (
    <span ref={wrapRef}>
      <Checkbox {...props} />
    </span>
  );
}

export default function Roles() {
  const { t } = useTranslation();
  const { can } = usePermission();
  const canCreate = can("role:create");
  const canEdit = can("role:update");
  const canDelete = can("role:delete");

  const table = useDataTable(10);
  const {
    data,
    error,
    isLoading,
    refetch,
  } = useRoles({
    page: table.page,
    page_size: table.pageSize,
    search: table.debouncedSearch,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const deleteMutation = useDeleteRole();
  const { data: categories = [] } = usePermissionCategories(createOpen || editTarget !== null);

  const [form, setForm] = useState({ name: "", description: "", permissions: [] as string[] });
  const [formErrors, setFormErrors] = useState<{ name?: string }>({});

  function openCreate() {
    setForm({ name: "", description: "", permissions: [] });
    setFormErrors({});
    setCreateOpen(true);
  }

  function openEdit(role: Role) {
    setForm({ name: role.name, description: role.description, permissions: [...role.permissions] });
    setFormErrors({});
    setEditTarget(role);
  }

  function togglePerm(code: string) {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(code)
        ? current.permissions.filter((v) => v !== code)
        : [...current.permissions, code],
    }));
  }

  function isCategoryFullySelected(cat: PermissionCategory) {
    return cat.permissions.length > 0 && cat.permissions.every((p) => form.permissions.includes(p.code));
  }

  function isCategoryPartiallySelected(cat: PermissionCategory) {
    const count = cat.permissions.filter((p) => form.permissions.includes(p.code)).length;
    return count > 0 && count < cat.permissions.length;
  }

  function toggleCategory(cat: PermissionCategory) {
    const codes = cat.permissions.map((p) => p.code);
    if (isCategoryFullySelected(cat)) {
      setForm((current) => ({
        ...current,
        permissions: current.permissions.filter((p) => !codes.includes(p)),
      }));
    } else {
      setForm((current) => ({
        ...current,
        permissions: [...new Set([...current.permissions, ...codes])],
      }));
    }
  }

  function resetFilters() {
    table.setSearch("");
    table.reset();
  }

  function validateForm() {
    const errors: { name?: string } = {};
    if (!form.name.trim()) errors.name = t("common.fieldRequired", { field: t("roles.name") });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreate() {
    if (!validateForm()) return;
    try {
      await createMutation.mutateAsync({
        name: form.name,
        description: form.description,
        permissions: form.permissions,
      });
      toast.success(t("roles.createTitle"));
      setCreateOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  async function handleUpdate() {
    if (!editTarget) return;
    if (!validateForm()) return;
    try {
      await updateMutation.mutateAsync({
        id: editTarget.id,
        name: form.name,
        description: form.description,
        permissions: form.permissions,
      });
      toast.success(t("roles.editTitle"));
      setEditTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t("roles.deleteTitle"));
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  const roles = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;
  const hasFilters = Boolean(table.search.trim());
  usePageBounds(table.page, totalPages, table.setPage);

  const columns = [
    { key: "name" as const, header: t("roles.name"), width: "15%" },
    { key: "description" as const, header: t("roles.description"), width: "25%" },
    { key: "permissions" as const, header: t("roles.permissions"), width: "30%" },
    { key: "user_count" as const, header: t("roles.userCount"), width: "8%", align: "center" as const },
    { key: "actions" as const, header: t("common.actions"), width: "14%", align: "right" as const },
  ];

  const rows: RoleRow[] = roles.map((role) =>
    toRow(role, () => openEdit(role), () => setDeleteTarget(role), canEdit, canDelete, t),
  );

  const permissionsCheckboxes = (
    <div className="stc-perm-grid">
      {categories.map((cat) => (
        <div key={cat.category} className="stc-perm-group">
          <div className="stc-perm-group__header">
            <IndeterminateCheckbox
              label={cat.category}
              checked={isCategoryFullySelected(cat)}
              indeterminate={isCategoryPartiallySelected(cat)}
              onChange={() => toggleCategory(cat)}
            />
          </div>
          <div className="stc-perm-group__items">
            {cat.permissions.map((p) => (
              <Checkbox
                key={p.code}
                label={p.name}
                description={p.description}
                checked={form.permissions.includes(p.code)}
                onChange={() => togglePerm(p.code)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const errorMessage = error instanceof Error ? error.message : t("common.loadFailed");

  return (
    <PageShell
      title={t("roles.title")}
      description={t("roles.descriptionLong")}
      actions={
        canCreate ? (
          <Button tone="primary" onClick={openCreate}>{t("roles.create")}</Button>
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
            placeholder={t("roles.search")}
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
                  {hasFilters ? t("common.reset") : t("roles.create")}
                </Button>
              )}
              description={hasFilters ? t("common.emptyFiltered") : t("roles.emptyDescription")}
              headers={columns.map((column) => column.header)}
              heading={hasFilters ? t("common.noData") : t("roles.emptyTitle")}
            />
          ) : (
            <>
              <DataTable<RoleRow> columns={columns} rows={rows} />
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
        title={t("roles.createTitle")}
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
          <Input label={t("roles.name")} value={form.name} status={formErrors.name ? "error" : "default"} message={formErrors.name} onChange={(e) => { setForm((current) => ({ ...current, name: e.target.value })); setFormErrors((current) => ({ ...current, name: undefined })); }} />
          <Input label={t("roles.description")} value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} />
          {permissionsCheckboxes}
        </div>
      </Modal>

      <Modal
        open={editTarget !== null}
        title={t("roles.editTitle")}
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
          <Input label={t("roles.name")} value={form.name} status={formErrors.name ? "error" : "default"} message={formErrors.name} onChange={(e) => { setForm((current) => ({ ...current, name: e.target.value })); setFormErrors((current) => ({ ...current, name: undefined })); }} />
          <Input label={t("roles.description")} value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} />
          {permissionsCheckboxes}
        </div>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        title={t("roles.deleteTitle")}
        description={t("roles.deleteConfirm", { name: deleteTarget?.name })}
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
