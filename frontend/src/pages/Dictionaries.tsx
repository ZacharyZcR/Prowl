import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Button,
  DataTable,
  EmptyTable,
  Input,
  Modal,
  Skeleton,
  Tag,
} from "@yza/ui";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import {
  useDicts,
  useCreateDict,
  useUpdateDict,
  useDeleteDict,
  useToggleDict,
  type DictItem,
} from "@/hooks/useDicts";
import { PageShell } from "@/components/PageShell";

interface DictRow extends Record<string, ReactNode> {
  key: ReactNode;
  label: ReactNode;
  value: ReactNode;
  sort_order: ReactNode;
  enabled: ReactNode;
  actions: ReactNode;
}

interface DictForm {
  group_name: string;
  key: string;
  label: string;
  value: string;
  sort_order: number;
}

const emptyForm: DictForm = {
  group_name: "",
  key: "",
  label: "",
  value: "",
  sort_order: 0,
};

export default function Dictionaries() {
  const { t } = useTranslation();
  const { can } = usePermission();
  const canCreate = can("dict:create");
  const canUpdate = can("dict:update");
  const canDelete = can("dict:delete");

  const { data, error, isLoading, refetch } = useDicts();

  const [activeGroup, setActiveGroup] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DictItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DictItem | null>(null);

  const createMutation = useCreateDict();
  const updateMutation = useUpdateDict();
  const deleteMutation = useDeleteDict();
  const toggleMutation = useToggleDict();

  const [form, setForm] = useState<DictForm>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<{ group_name?: string; key?: string }>({});

  const items = data ?? [];

  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) set.add(item.group_name);
    return Array.from(set).sort();
  }, [items]);
  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      counts.set(item.group_name, (counts.get(item.group_name) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const selectedGroup = activeGroup || groups[0] || "";

  useEffect(() => {
    if (groups.length === 0) {
      if (activeGroup) {
        setActiveGroup("");
      }
      return;
    }

    if (activeGroup && groups.includes(activeGroup)) {
      return;
    }

    setActiveGroup(groups[0]);
  }, [activeGroup, groups]);

  const filteredItems = useMemo(
    () => items
      .filter((item) => item.group_name === selectedGroup)
      .sort((a, b) => a.sort_order - b.sort_order),
    [items, selectedGroup],
  );

  function openCreate() {
    setForm({ ...emptyForm, group_name: selectedGroup });
    setFormErrors({});
    setCreateOpen(true);
  }

  function openEdit(item: DictItem) {
    setForm({
      group_name: item.group_name,
      key: item.key,
      label: item.label,
      value: item.value,
      sort_order: item.sort_order,
    });
    setFormErrors({});
    setEditTarget(item);
  }

  function validateForm() {
    const errors: { group_name?: string; key?: string } = {};
    if (!form.group_name.trim()) errors.group_name = t("common.fieldRequired", { field: t("dictionaries.groupName") });
    if (!form.key.trim()) errors.key = t("common.fieldRequired", { field: t("dictionaries.key") });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreate() {
    if (!validateForm()) return;
    try {
      await createMutation.mutateAsync({
        ...form,
        group_name: form.group_name.trim(),
        key: form.key.trim(),
        label: form.label.trim(),
        value: form.value.trim(),
      });
      toast.success(t("dictionaries.createTitle"));
      setCreateOpen(false);
      if (!activeGroup) setActiveGroup(form.group_name.trim());
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
        ...form,
        group_name: form.group_name.trim(),
        key: form.key.trim(),
        label: form.label.trim(),
        value: form.value.trim(),
      });
      toast.success(t("dictionaries.editTitle"));
      setEditTarget(null);
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

  async function handleToggle(item: DictItem) {
    try {
      await toggleMutation.mutateAsync(item.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  const columns = [
    { key: "key" as const, header: t("dictionaries.key"), width: "18%" },
    { key: "label" as const, header: t("dictionaries.label"), width: "20%" },
    { key: "value" as const, header: t("dictionaries.value"), width: "20%" },
    { key: "sort_order" as const, header: t("dictionaries.sortOrder"), width: "10%", align: "right" as const },
    { key: "enabled" as const, header: t("dictionaries.enabled"), width: "10%" },
    { key: "actions" as const, header: t("common.actions"), width: "22%", align: "right" as const },
  ];

  const rows: DictRow[] = filteredItems.map((item) => ({
    key: item.key,
    label: item.label,
    value: <code className="stc-inline-code">{item.value}</code>,
    sort_order: String(item.sort_order),
    enabled: (
      <Button
        size="sm"
        tone={item.enabled ? "primary" : "outline"}
        onClick={() => { void handleToggle(item); }}
        disabled={!canUpdate}
      >
        {item.enabled ? t("common.enabled") : t("common.disabled")}
      </Button>
    ),
    actions: (
      <div className="yza-button-row">
        {canUpdate && (
          <Button size="sm" tone="outline" onClick={() => openEdit(item)}>
            {t("common.edit")}
          </Button>
        )}
        {canDelete && (
          <Button size="sm" tone="danger" onClick={() => setDeleteTarget(item)}>
            {t("common.delete")}
          </Button>
        )}
      </div>
    ),
  }));

  const errorMessage = error instanceof Error ? error.message : t("common.loadFailed");

  const formModal = (
    <div className="yza-doc-stack">
      <Input
        label={t("dictionaries.groupName")}
        value={form.group_name}
        status={formErrors.group_name ? "error" : "default"}
        message={formErrors.group_name}
        onChange={(e) => {
          setForm((cur) => ({ ...cur, group_name: e.target.value }));
          setFormErrors((cur) => ({ ...cur, group_name: undefined }));
        }}
      />
      <Input
        label={t("dictionaries.key")}
        value={form.key}
        status={formErrors.key ? "error" : "default"}
        message={formErrors.key}
        onChange={(e) => {
          setForm((cur) => ({ ...cur, key: e.target.value }));
          setFormErrors((cur) => ({ ...cur, key: undefined }));
        }}
      />
      <Input
        label={t("dictionaries.label")}
        value={form.label}
        onChange={(e) => setForm((cur) => ({ ...cur, label: e.target.value }))}
      />
      <Input
        label={t("dictionaries.value")}
        value={form.value}
        onChange={(e) => setForm((cur) => ({ ...cur, value: e.target.value }))}
      />
      <Input
        label={t("dictionaries.sortOrder")}
        type="number"
        value={String(form.sort_order)}
        onChange={(e) => setForm((cur) => ({ ...cur, sort_order: Number(e.target.value) || 0 }))}
      />
    </div>
  );

  return (
    <PageShell
      title={t("dictionaries.title")}
      description={t("dictionaries.description")}
      actions={
        canCreate ? (
          <Button tone="primary" onClick={openCreate}>{t("dictionaries.create")}</Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <Skeleton count={4} height={80} />
      ) : error ? (
        <section className="yza-doc-card">
          <Alert heading={t("common.loadFailed")} description={errorMessage} tone="danger" />
          <div className="stc-stack-gap-sm">
            <Button tone="outline" onClick={() => { void refetch(); }}>
              {t("common.retry")}
            </Button>
          </div>
        </section>
      ) : (
        <div className="stc-dict-layout">
          {/* Group list */}
          <div className="stc-dict-sidebar">
            <div className="yza-doc-card stc-dict-group-card">
              {groups.length === 0 ? (
                <div className="stc-dict-group-empty">
                  {t("common.noData")}
                </div>
              ) : (
                groups.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setActiveGroup(g)}
                    className={`stc-dict-group-btn${g === selectedGroup ? " stc-dict-group-btn--active" : ""}`}
                    aria-pressed={g === selectedGroup}
                  >
                    {g}
                    <Tag tone="neutral" className="stc-dict-group-btn__count">
                      {groupCounts.get(g) ?? 0}
                    </Tag>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Items table */}
          <div className="stc-dict-content">
            <section className="yza-doc-card">
              <div className="yza-doc-stack">
                {filteredItems.length === 0 ? (
                  <EmptyTable
                    action={
                      canCreate ? (
                        <Button tone="outline" onClick={openCreate}>
                          {t("dictionaries.create")}
                        </Button>
                      ) : undefined
                    }
                    description={t("dictionaries.description")}
                    headers={columns.map((c) => c.header)}
                    heading={t("common.noData")}
                  />
                ) : (
                  <DataTable<DictRow> columns={columns} rows={rows} />
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={createOpen}
        title={t("dictionaries.createTitle")}
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
        {formModal}
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editTarget !== null}
        title={t("dictionaries.editTitle")}
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
        {formModal}
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={deleteTarget !== null}
        title={t("common.delete")}
        description={`${deleteTarget?.group_name} / ${deleteTarget?.key}`}
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
