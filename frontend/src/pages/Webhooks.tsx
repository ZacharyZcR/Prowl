import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  DataTable,
  EmptyTable,
  Modal,
  Skeleton,
  Tag,
} from "@yza/ui";
import { toast } from "sonner";
import { WebhookFormFields } from "@/components/webhooks/WebhookFormFields";
import { usePermission } from "@/hooks/usePermission";
import {
  useWebhooks,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useToggleWebhook,
  useTestWebhook,
} from "@/hooks/useWebhooks";
import { PageShell } from "@/components/PageShell";
import {
  buildWebhookHeaders,
  createEmptyWebhookForm,
  createHeaderRow,
  mapWebhookToForm,
  webhookFormSchema,
  type WebhookForm,
} from "@/lib/webhooks";
import type { Webhook, WebhookTestResult } from "@/types";

interface WebhookRow extends Record<string, ReactNode> {
  name: ReactNode;
  url: ReactNode;
  events: ReactNode;
  enabled: ReactNode;
  last_status: ReactNode;
  failures: ReactNode;
  actions: ReactNode;
}

function statusTone(code: number): "success" | "neutral" | "danger" {
  if (code === 0) return "neutral";
  if (code >= 200 && code < 300) return "success";
  return "danger";
}

function statusLabel(code: number, t: (key: string) => string): string {
  if (code === 0) return t("webhooks.notTriggered");
  return String(code);
}

export default function Webhooks() {
  const { t } = useTranslation();
  const { can } = usePermission();
  const canManage = can("system:settings");

  const { data, error, isLoading, refetch } = useWebhooks();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Webhook | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null);
  const [testResult, setTestResult] = useState<WebhookTestResult | null>(null);
  const [testingWebhookId, setTestingWebhookId] = useState<number | null>(null);

  const createMutation = useCreateWebhook();
  const updateMutation = useUpdateWebhook();
  const deleteMutation = useDeleteWebhook();
  const toggleMutation = useToggleWebhook();
  const testMutation = useTestWebhook();
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<WebhookForm>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: createEmptyWebhookForm(),
  });
  const events = watch("events") ?? [];
  const headers = watch("headers") ?? [];

  function openCreate() {
    reset(createEmptyWebhookForm());
    setCreateOpen(true);
  }

  function openEdit(webhook: Webhook) {
    reset(mapWebhookToForm(webhook));
    setEditTarget(webhook);
  }

  const handleCreate = handleSubmit(async (form) => {
    try {
      await createMutation.mutateAsync({
        name: form.name,
        url: form.url,
        secret: form.secret || undefined,
        events: form.events,
        headers: buildWebhookHeaders(form.headers),
      });
      toast.success(t("webhooks.createTitle"));
      setCreateOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  });

  const handleUpdate = handleSubmit(async (form) => {
    if (!editTarget) return;
    try {
      await updateMutation.mutateAsync({
        id: editTarget.id,
        name: form.name,
        url: form.url,
        secret: form.secret || undefined,
        events: form.events,
        headers: buildWebhookHeaders(form.headers),
      });
      toast.success(t("webhooks.editTitle"));
      setEditTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t("webhooks.deleteTitle"));
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  async function handleToggle(webhook: Webhook) {
    try {
      await toggleMutation.mutateAsync(webhook.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  async function handleTest(webhook: Webhook) {
    try {
      setTestingWebhookId(webhook.id);
      const result = await testMutation.mutateAsync(webhook.id);
      setTestResult(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    } finally {
      setTestingWebhookId(null);
    }
  }

  function toggleEvent(event: string) {
    setValue(
      "events",
      events.includes(event)
        ? events.filter((item) => item !== event)
        : [...events, event],
      { shouldDirty: true, shouldValidate: true },
    );
  }

  function addHeader() {
    setValue("headers", [...headers, createHeaderRow()], { shouldDirty: true, shouldValidate: true });
  }

  function removeHeader(id: string) {
    setValue("headers", headers.filter((header) => header.id !== id), { shouldDirty: true, shouldValidate: true });
  }

  function updateHeader(id: string, field: "key" | "value", value: string) {
    setValue(
      "headers",
      headers.map((header) => (
        header.id === id ? { ...header, [field]: value } : header
      )),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  const webhooks = data ?? [];

  const columns = [
    { key: "name" as const, header: t("webhooks.name"), width: "15%" },
    { key: "url" as const, header: t("webhooks.url"), width: "22%" },
    { key: "events" as const, header: t("webhooks.events"), width: "20%" },
    { key: "enabled" as const, header: t("webhooks.enabled"), width: "8%" },
    { key: "last_status" as const, header: t("webhooks.lastStatus"), width: "10%" },
    { key: "failures" as const, header: t("webhooks.failures"), width: "8%" },
    { key: "actions" as const, header: t("common.actions"), width: "17%", align: "right" as const },
  ];

  const rows: WebhookRow[] = webhooks.map((webhook) => ({
    name: webhook.name,
    url: <span className="stc-webhook-url">{webhook.url}</span>,
    events: (
      <div className="stc-webhook-events">
        {webhook.events.slice(0, 3).map((event) => (
          <Tag key={event} tone="info">{event}</Tag>
        ))}
        {webhook.events.length > 3 && (
          <Tag tone="neutral">+{webhook.events.length - 3}</Tag>
        )}
      </div>
    ),
    enabled: (
      <Button
        size="sm"
        tone={webhook.enabled ? "primary" : "outline"}
        onClick={() => handleToggle(webhook)}
        disabled={!canManage}
      >
        {webhook.enabled ? t("common.enabled") : t("common.disabled")}
      </Button>
    ),
    last_status: (
      <Tag tone={statusTone(webhook.last_status_code)}>
        {statusLabel(webhook.last_status_code, t)}
      </Tag>
    ),
    failures: webhook.failure_count > 0 ? (
      <Tag tone="danger">{webhook.failure_count}</Tag>
    ) : (
      <Tag tone="neutral">0</Tag>
    ),
    actions: (
      <div className="yza-button-row">
        {canManage && (
          <Button
            size="sm"
            tone="outline"
            onClick={() => handleTest(webhook)}
            disabled={testingWebhookId === webhook.id}
            aria-busy={testingWebhookId === webhook.id}
          >
            {t("webhooks.test")}
          </Button>
        )}
        {canManage && (
          <Button size="sm" tone="outline" onClick={() => openEdit(webhook)}>
            {t("common.edit")}
          </Button>
        )}
        {canManage && (
          <Button size="sm" tone="danger" onClick={() => setDeleteTarget(webhook)}>
            {t("common.delete")}
          </Button>
        )}
      </div>
    ),
  }));

  const errorMessage = error instanceof Error ? error.message : t("common.loadFailed");
  const { ref: _nameRef, ...nameField } = register("name");
  const { ref: _urlRef, ...urlField } = register("url");
  const { ref: _secretRef, ...secretField } = register("secret");

  return (
    <PageShell
      title={t("webhooks.title")}
      description={t("webhooks.description")}
      actions={
        canManage ? (
          <Button tone="primary" onClick={openCreate}>{t("webhooks.create")}</Button>
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
              action={
                canManage ? (
                  <Button tone="outline" onClick={openCreate}>
                    {t("webhooks.create")}
                  </Button>
                ) : undefined
              }
              description={t("webhooks.emptyDescription")}
              headers={columns.map((column) => column.header)}
              heading={t("webhooks.emptyTitle")}
            />
          ) : (
            <DataTable<WebhookRow> columns={columns} rows={rows} />
          )}
        </div>
      </section>

      <Modal
        open={createOpen}
        title={t("webhooks.createTitle")}
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
        <WebhookFormFields
          editTarget={null}
          events={events}
          formErrors={{
            events: errors.events?.message,
            headers: errors.headers?.message,
            name: errors.name?.message,
            url: errors.url?.message,
          }}
          headers={headers}
          nameField={nameField}
          onAddHeader={addHeader}
          onRemoveHeader={removeHeader}
          onToggleEvent={toggleEvent}
          onUpdateHeader={updateHeader}
          secretField={secretField}
          t={t}
          urlField={urlField}
        />
      </Modal>

      <Modal
        open={editTarget !== null}
        title={t("webhooks.editTitle")}
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
        <WebhookFormFields
          editTarget={editTarget}
          events={events}
          formErrors={{
            events: errors.events?.message,
            headers: errors.headers?.message,
            name: errors.name?.message,
            url: errors.url?.message,
          }}
          headers={headers}
          nameField={nameField}
          onAddHeader={addHeader}
          onRemoveHeader={removeHeader}
          onToggleEvent={toggleEvent}
          onUpdateHeader={updateHeader}
          secretField={secretField}
          t={t}
          urlField={urlField}
        />
      </Modal>

      <Modal
        open={deleteTarget !== null}
        title={t("webhooks.deleteTitle")}
        description={t("webhooks.deleteConfirm", { name: deleteTarget?.name })}
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

      <Modal
        open={testResult !== null}
        title={t("webhooks.testResult")}
        onClose={() => setTestResult(null)}
        footer={
          <div className="yza-button-row">
            <Button tone="outline" onClick={() => setTestResult(null)}>{t("common.confirm")}</Button>
          </div>
        }
      >
        {testResult && (
          <div className="yza-doc-stack">
            <div>
              <strong>{t("webhooks.statusCode")}:</strong>{" "}
              <Tag tone={statusTone(testResult.status_code)}>{testResult.status_code}</Tag>
            </div>
            <div>
              <strong>{t("webhooks.duration")}:</strong> {testResult.duration}
            </div>
            <div>
              <strong>{t("webhooks.responseBody")}:</strong>
              <pre className="stc-webhook-response">
                {testResult.response_body || t("webhooks.emptyResponse")}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
