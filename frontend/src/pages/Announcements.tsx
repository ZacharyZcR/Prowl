import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Button,
  DataTable,
  EmptyTable,
  Input,
  Modal,
  Select,
  Skeleton,
  Tag,
  Textarea,
} from "@yza/ui";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import {
  useAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  usePublishAnnouncement,
  useUnpublishAnnouncement,
  type Announcement,
} from "@/hooks/useAnnouncements";
import { PageShell } from "@/components/PageShell";
import { formatDateTime } from "@/lib/datetime";

type TagTone = "neutral" | "info" | "success" | "warning" | "danger";

const PRIORITY_TONE: Record<string, TagTone> = {
  info: "info",
  warning: "warning",
  critical: "danger",
};

interface AnnouncementRow extends Record<string, ReactNode> {
  title: ReactNode;
  priority: ReactNode;
  published: ReactNode;
  published_at: ReactNode;
  expires_at: ReactNode;
  actions: ReactNode;
}

interface AnnouncementForm {
  title: string;
  content: string;
  priority: string;
  expires_at: string;
}

const emptyForm: AnnouncementForm = {
  title: "",
  content: "",
  priority: "info",
  expires_at: "",
};

export default function Announcements() {
  const { t } = useTranslation();
  const { can } = usePermission();
  const canCreate = can("announcement:create");
  const canUpdate = can("announcement:update");
  const canDelete = can("announcement:delete");

  const { data, error, isLoading, refetch } = useAnnouncements();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();
  const publishMutation = usePublishAnnouncement();
  const unpublishMutation = useUnpublishAnnouncement();

  const [form, setForm] = useState<AnnouncementForm>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<{ title?: string }>({});

  function openCreate() {
    setForm({ ...emptyForm });
    setFormErrors({});
    setCreateOpen(true);
  }

  function openEdit(ann: Announcement) {
    setForm({
      title: ann.title,
      content: ann.content,
      priority: ann.priority,
      expires_at: ann.expires_at ? ann.expires_at.slice(0, 16) : "",
    });
    setFormErrors({});
    setEditTarget(ann);
  }

  function validateForm() {
    const errors: { title?: string } = {};
    if (!form.title.trim()) errors.title = t("common.fieldRequired", { field: t("announcements.titleField") });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreate() {
    if (!validateForm()) return;
    try {
      await createMutation.mutateAsync({
        title: form.title.trim(),
        content: form.content.trim(),
        priority: form.priority,
        expires_at: form.expires_at || undefined,
      });
      toast.success(t("announcements.createTitle"));
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
        title: form.title.trim(),
        content: form.content.trim(),
        priority: form.priority,
        expires_at: form.expires_at || undefined,
      });
      toast.success(t("announcements.editTitle"));
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

  async function handlePublish(ann: Announcement) {
    try {
      await publishMutation.mutateAsync(ann.id);
      toast.success(t("announcements.publish"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  async function handleUnpublish(ann: Announcement) {
    try {
      await unpublishMutation.mutateAsync(ann.id);
      toast.success(t("announcements.unpublish"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  const announcements = data ?? [];

  const columns = [
    { key: "title" as const, header: t("announcements.titleField"), width: "25%" },
    { key: "priority" as const, header: t("announcements.priority"), width: "10%" },
    { key: "published" as const, header: t("announcements.published"), width: "10%" },
    { key: "published_at" as const, header: t("announcements.publish"), width: "15%" },
    { key: "expires_at" as const, header: t("announcements.expiresAt"), width: "15%" },
    { key: "actions" as const, header: t("common.actions"), width: "25%", align: "right" as const },
  ];

  const rows: AnnouncementRow[] = announcements.map((ann) => ({
    title: ann.title,
    priority: (
      <Tag tone={PRIORITY_TONE[ann.priority] ?? "neutral"}>
        {t(`announcements.${ann.priority}`)}
      </Tag>
    ),
    published: ann.published
      ? <Tag tone="success">{t("announcements.published")}</Tag>
      : <Tag tone="neutral">{t("announcements.unpublished")}</Tag>,
    published_at: formatDateTime(ann.published_at),
    expires_at: formatDateTime(ann.expires_at),
    actions: (
      <div className="yza-button-row">
        {canUpdate && !ann.published && (
          <Button size="sm" tone="primary" onClick={() => { void handlePublish(ann); }}>
            {t("announcements.publish")}
          </Button>
        )}
        {canUpdate && ann.published && (
          <Button size="sm" tone="outline" onClick={() => { void handleUnpublish(ann); }}>
            {t("announcements.unpublish")}
          </Button>
        )}
        {canUpdate && (
          <Button size="sm" tone="outline" onClick={() => openEdit(ann)}>
            {t("common.edit")}
          </Button>
        )}
        {canDelete && (
          <Button size="sm" tone="danger" onClick={() => setDeleteTarget(ann)}>
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
        label={t("announcements.titleField")}
        value={form.title}
        status={formErrors.title ? "error" : "default"}
        message={formErrors.title}
        onChange={(e) => {
          setForm((cur) => ({ ...cur, title: e.target.value }));
          setFormErrors((cur) => ({ ...cur, title: undefined }));
        }}
      />
      <Textarea
        label={t("announcements.content")}
        value={form.content}
        onChange={(e) => setForm((cur) => ({ ...cur, content: e.target.value }))}
        rows={4}
      />
      <Select
        label={t("announcements.priority")}
        value={form.priority}
        onChange={(e) => setForm((cur) => ({ ...cur, priority: e.target.value }))}
      >
        <option value="info">{t("announcements.info")}</option>
        <option value="warning">{t("announcements.warning")}</option>
        <option value="critical">{t("announcements.critical")}</option>
      </Select>
      <Input
        label={t("announcements.expiresAt")}
        type="datetime-local"
        value={form.expires_at}
        onChange={(e) => setForm((cur) => ({ ...cur, expires_at: e.target.value }))}
      />
    </div>
  );

  return (
    <PageShell
      title={t("announcements.title")}
      description={t("announcements.description")}
      actions={
        canCreate ? (
          <Button tone="primary" onClick={openCreate}>{t("announcements.create")}</Button>
        ) : undefined
      }
    >
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
              action={
                canCreate ? (
                  <Button tone="outline" onClick={openCreate}>
                    {t("announcements.create")}
                  </Button>
                ) : undefined
              }
              description={t("announcements.emptyDescription")}
              headers={columns.map((c) => c.header)}
              heading={t("announcements.emptyTitle")}
            />
          ) : (
            <DataTable<AnnouncementRow> columns={columns} rows={rows} />
          )}
        </div>
      </section>

      {/* Create Modal */}
      <Modal
        open={createOpen}
        title={t("announcements.createTitle")}
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
        title={t("announcements.editTitle")}
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
        description={deleteTarget?.title}
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
