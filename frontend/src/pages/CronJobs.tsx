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
} from "@yza/ui";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import {
  useCronJobs,
  useCreateCronJob,
  useUpdateCronJob,
  useDeleteCronJob,
  useToggleCronJob,
  useRunCronJob,
  type CronJob,
} from "@/hooks/useCronJobs";
import { PageShell } from "@/components/PageShell";
import { formatDateTime } from "@/lib/datetime";

const HANDLERS = [
  "cleanup_expired_tokens",
  "cleanup_old_logs",
  "sync_external_data",
  "generate_reports",
  "send_digest_email",
  "health_check",
];

interface CronJobRow extends Record<string, ReactNode> {
  name: ReactNode;
  cron_expr: ReactNode;
  handler: ReactNode;
  enabled: ReactNode;
  last_run: ReactNode;
  last_status: ReactNode;
  next_run: ReactNode;
  actions: ReactNode;
}

type TagTone = "success" | "danger" | "neutral" | "info" | "warning";

function statusTone(status: string): TagTone {
  if (status === "success") return "success";
  if (status === "failed") return "danger";
  return "neutral";
}

interface CronJobForm {
  name: string;
  cron_expr: string;
  handler: string;
  enabled: boolean;
}

const emptyForm: CronJobForm = {
  name: "",
  cron_expr: "",
  handler: "",
  enabled: true,
};

export default function CronJobs() {
  const { t } = useTranslation();
  const { can } = usePermission();
  const canCreate = can("cron:create");
  const canUpdate = can("cron:update");
  const canDelete = can("cron:delete");

  const { data, error, isLoading, refetch } = useCronJobs();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CronJob | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CronJob | null>(null);
  const [runningJobId, setRunningJobId] = useState<number | null>(null);

  const createMutation = useCreateCronJob();
  const updateMutation = useUpdateCronJob();
  const deleteMutation = useDeleteCronJob();
  const toggleMutation = useToggleCronJob();
  const runMutation = useRunCronJob();

  const [form, setForm] = useState<CronJobForm>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<{ name?: string; cron_expr?: string; handler?: string }>({});

  function openCreate() {
    setForm({ ...emptyForm });
    setFormErrors({});
    setCreateOpen(true);
  }

  function openEdit(job: CronJob) {
    setForm({
      name: job.name,
      cron_expr: job.cron_expr,
      handler: job.handler,
      enabled: job.enabled,
    });
    setFormErrors({});
    setEditTarget(job);
  }

  function validateForm() {
    const errors: { name?: string; cron_expr?: string; handler?: string } = {};
    if (!form.name.trim()) errors.name = t("common.fieldRequired", { field: t("cronJobs.name") });
    if (!form.cron_expr.trim()) errors.cron_expr = t("common.fieldRequired", { field: t("cronJobs.cronExpr") });
    if (!form.handler) errors.handler = t("common.fieldRequired", { field: t("cronJobs.handler") });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreate() {
    if (!validateForm()) return;
    try {
      await createMutation.mutateAsync({
        ...form,
        name: form.name.trim(),
        cron_expr: form.cron_expr.trim(),
      });
      toast.success(t("cronJobs.createTitle"));
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
        ...form,
        name: form.name.trim(),
        cron_expr: form.cron_expr.trim(),
      });
      toast.success(t("cronJobs.editTitle"));
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

  async function handleToggle(job: CronJob) {
    try {
      await toggleMutation.mutateAsync(job.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  async function handleRunNow(job: CronJob) {
    setRunningJobId(job.id);
    try {
      await runMutation.mutateAsync(job.id);
      toast.success(t("cronJobs.runNow"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    } finally {
      setRunningJobId(null);
    }
  }

  const jobs = data ?? [];

  const columns = [
    { key: "name" as const, header: t("cronJobs.name"), width: "14%" },
    { key: "cron_expr" as const, header: t("cronJobs.cronExpr"), width: "12%" },
    { key: "handler" as const, header: t("cronJobs.handler"), width: "14%" },
    { key: "enabled" as const, header: t("cronJobs.enabled"), width: "8%" },
    { key: "last_run" as const, header: t("cronJobs.lastRun"), width: "14%" },
    { key: "last_status" as const, header: t("cronJobs.lastStatus"), width: "8%" },
    { key: "next_run" as const, header: t("cronJobs.nextRun"), width: "14%" },
    { key: "actions" as const, header: t("common.actions"), width: "16%", align: "right" as const },
  ];

  const rows: CronJobRow[] = jobs.map((job) => ({
    name: job.name,
    cron_expr: <code className="stc-inline-code">{job.cron_expr}</code>,
    handler: job.handler,
    enabled: (
      <Button
        size="sm"
        tone={job.enabled ? "primary" : "outline"}
        onClick={() => { void handleToggle(job); }}
        disabled={!canUpdate}
      >
        {job.enabled ? t("common.enabled") : t("common.disabled")}
      </Button>
    ),
    last_run: formatDateTime(job.last_run_at),
    last_status: job.last_status
      ? <Tag tone={statusTone(job.last_status)}>{t(`cronJobs.statuses.${job.last_status}`)}</Tag>
      : <Tag tone="neutral">-</Tag>,
    next_run: formatDateTime(job.next_run_at),
    actions: (
      <div className="yza-button-row">
        {canUpdate && (
            <Button
              size="sm"
              tone="outline"
              onClick={() => { void handleRunNow(job); }}
              disabled={runningJobId === job.id}
            >
              {t("cronJobs.runNow")}
            </Button>
        )}
        {canUpdate && (
          <Button size="sm" tone="outline" onClick={() => openEdit(job)}>
            {t("common.edit")}
          </Button>
        )}
        {canDelete && (
          <Button size="sm" tone="danger" onClick={() => setDeleteTarget(job)}>
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
        label={t("cronJobs.name")}
        value={form.name}
        status={formErrors.name ? "error" : "default"}
        message={formErrors.name}
        onChange={(e) => {
          setForm((cur) => ({ ...cur, name: e.target.value }));
          setFormErrors((cur) => ({ ...cur, name: undefined }));
        }}
      />
      <Input
        label={t("cronJobs.cronExpr")}
        value={form.cron_expr}
        status={formErrors.cron_expr ? "error" : "default"}
        message={formErrors.cron_expr}
        placeholder="*/5 * * * *"
        onChange={(e) => {
          setForm((cur) => ({ ...cur, cron_expr: e.target.value }));
          setFormErrors((cur) => ({ ...cur, cron_expr: undefined }));
        }}
      />
      <Select
        label={t("cronJobs.handler")}
        value={form.handler}
        onChange={(e) => {
          setForm((cur) => ({ ...cur, handler: e.target.value }));
          setFormErrors((cur) => ({ ...cur, handler: undefined }));
        }}
      >
        <option value="">--</option>
        {HANDLERS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </Select>
      {formErrors.handler && (
        <p className="stc-form-error">
          {formErrors.handler}
        </p>
      )}
      <label className="stc-checkbox-row">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => setForm((cur) => ({ ...cur, enabled: e.target.checked }))}
        />
        {t("cronJobs.enabled")}
      </label>
    </div>
  );

  return (
    <PageShell
      title={t("cronJobs.title")}
      description={t("cronJobs.description")}
      actions={
        canCreate ? (
          <Button tone="primary" onClick={openCreate}>{t("cronJobs.create")}</Button>
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
                    {t("cronJobs.create")}
                  </Button>
                ) : undefined
              }
              description={t("cronJobs.emptyDescription")}
              headers={columns.map((c) => c.header)}
              heading={t("cronJobs.emptyTitle")}
            />
          ) : (
            <DataTable<CronJobRow> columns={columns} rows={rows} />
          )}
        </div>
      </section>

      {/* Create Modal */}
      <Modal
        open={createOpen}
        title={t("cronJobs.createTitle")}
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
        title={t("cronJobs.editTitle")}
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
        description={t("cronJobs.deleteConfirm", { name: deleteTarget?.name })}
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
