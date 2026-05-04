import { useState, type ReactNode } from "react";
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
  useWebhooks,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useToggleWebhook,
  useTestWebhook,
} from "@/hooks/useWebhooks";
import { PageShell } from "@/components/PageShell";
import type { Webhook, WebhookTestResult } from "@/types";

const ALL_EVENTS = [
  "user.create", "user.update", "user.delete",
  "project.create", "project.update", "project.delete",
  "role.create", "role.update", "role.delete",
  "notification.create",
];

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

function statusLabel(code: number, t: (k: string) => string): string {
  if (code === 0) return t("webhooks.notTriggered");
  return String(code);
}

interface WebhookForm {
  name: string;
  url: string;
  secret: string;
  events: string[];
  headers: { key: string; value: string }[];
}

const emptyForm: WebhookForm = {
  name: "",
  url: "",
  secret: "",
  events: [],
  headers: [],
};

export default function Webhooks() {
  const { t } = useTranslation();
  const { can } = usePermission();
  const canManage = can("system:settings");

  const { data, error, isLoading, refetch } = useWebhooks();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Webhook | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null);
  const [testResult, setTestResult] = useState<WebhookTestResult | null>(null);

  const createMutation = useCreateWebhook();
  const updateMutation = useUpdateWebhook();
  const deleteMutation = useDeleteWebhook();
  const toggleMutation = useToggleWebhook();
  const testMutation = useTestWebhook();

  const [form, setForm] = useState<WebhookForm>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<{ name?: string; url?: string; events?: string }>({});

  function openCreate() {
    setForm({ ...emptyForm });
    setFormErrors({});
    setCreateOpen(true);
  }

  function openEdit(webhook: Webhook) {
    const headers = Object.entries(webhook.headers || {}).map(([key, value]) => ({ key, value }));
    setForm({
      name: webhook.name,
      url: webhook.url,
      secret: "",
      events: [...webhook.events],
      headers,
    });
    setFormErrors({});
    setEditTarget(webhook);
  }

  function validateForm() {
    const errors: { name?: string; url?: string; events?: string } = {};
    if (!form.name.trim()) errors.name = t("webhooks.name") + " is required";
    if (!form.url.trim()) errors.url = t("webhooks.url") + " is required";
    if (form.events.length === 0) errors.events = t("webhooks.events") + " is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function buildHeaders(): Record<string, string> | undefined {
    const filtered = form.headers.filter((h) => h.key.trim() && h.value.trim());
    if (filtered.length === 0) return undefined;
    const result: Record<string, string> = {};
    for (const h of filtered) {
      result[h.key.trim()] = h.value.trim();
    }
    return result;
  }

  async function handleCreate() {
    if (!validateForm()) return;
    try {
      await createMutation.mutateAsync({
        name: form.name,
        url: form.url,
        secret: form.secret || undefined,
        events: form.events,
        headers: buildHeaders(),
      });
      toast.success(t("webhooks.createTitle"));
      setCreateOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create webhook");
    }
  }

  async function handleUpdate() {
    if (!editTarget) return;
    if (!validateForm()) return;
    try {
      await updateMutation.mutateAsync({
        id: editTarget.id,
        name: form.name,
        url: form.url,
        secret: form.secret || undefined,
        events: form.events,
        headers: buildHeaders(),
      });
      toast.success(t("webhooks.editTitle"));
      setEditTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update webhook");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t("webhooks.deleteTitle"));
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete webhook");
    }
  }

  async function handleToggle(webhook: Webhook) {
    try {
      await toggleMutation.mutateAsync(webhook.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to toggle webhook");
    }
  }

  async function handleTest(webhook: Webhook) {
    try {
      const result = await testMutation.mutateAsync(webhook.id);
      setTestResult(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to test webhook");
    }
  }

  function toggleEvent(event: string) {
    setForm((cur) => ({
      ...cur,
      events: cur.events.includes(event)
        ? cur.events.filter((e) => e !== event)
        : [...cur.events, event],
    }));
    setFormErrors((cur) => ({ ...cur, events: undefined }));
  }

  function addHeader() {
    setForm((cur) => ({
      ...cur,
      headers: [...cur.headers, { key: "", value: "" }],
    }));
  }

  function removeHeader(index: number) {
    setForm((cur) => ({
      ...cur,
      headers: cur.headers.filter((_, i) => i !== index),
    }));
  }

  function updateHeader(index: number, field: "key" | "value", value: string) {
    setForm((cur) => ({
      ...cur,
      headers: cur.headers.map((h, i) => (i === index ? { ...h, [field]: value } : h)),
    }));
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
    url: (
      <span style={{ wordBreak: "break-all", fontSize: "0.85em" }}>
        {webhook.url}
      </span>
    ),
    events: (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {webhook.events.slice(0, 3).map((e) => (
          <Tag key={e} tone="info">{e}</Tag>
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
        {webhook.enabled ? "ON" : "OFF"}
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
            disabled={testMutation.isPending}
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

  const formModal = (
    <div className="yza-doc-stack">
      <Input
        label={t("webhooks.name")}
        value={form.name}
        status={formErrors.name ? "error" : "default"}
        message={formErrors.name}
        onChange={(e) => {
          setForm((cur) => ({ ...cur, name: e.target.value }));
          setFormErrors((cur) => ({ ...cur, name: undefined }));
        }}
      />
      <Input
        label={t("webhooks.url")}
        value={form.url}
        status={formErrors.url ? "error" : "default"}
        message={formErrors.url}
        onChange={(e) => {
          setForm((cur) => ({ ...cur, url: e.target.value }));
          setFormErrors((cur) => ({ ...cur, url: undefined }));
        }}
      />
      <Input
        label={t("webhooks.secret")}
        type="password"
        value={form.secret}
        placeholder={editTarget?.has_secret ? "••••••••" : ""}
        onChange={(e) => setForm((cur) => ({ ...cur, secret: e.target.value }))}
      />
      <p style={{ fontSize: "0.8em", color: "var(--color-text-muted)", margin: 0 }}>
        {t("webhooks.secretHint")}
      </p>
      <div>
        <label style={{ fontWeight: 500, marginBottom: 8, display: "block" }}>
          {t("webhooks.events")}
        </label>
        {formErrors.events && (
          <p style={{ color: "var(--color-danger)", fontSize: "0.85em", margin: "0 0 8px" }}>
            {formErrors.events}
          </p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
          {ALL_EVENTS.map((event) => (
            <label key={event} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.9em" }}>
              <input
                type="checkbox"
                checked={form.events.includes(event)}
                onChange={() => toggleEvent(event)}
              />
              {event}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontWeight: 500, marginBottom: 8, display: "block" }}>
          {t("webhooks.headers")}
        </label>
        {form.headers.map((h, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <Input
              placeholder="Header"
              value={h.key}
              onChange={(e) => updateHeader(i, "key", e.target.value)}
            />
            <Input
              placeholder="Value"
              value={h.value}
              onChange={(e) => updateHeader(i, "value", e.target.value)}
            />
            <Button size="sm" tone="danger" onClick={() => removeHeader(i)}>
              X
            </Button>
          </div>
        ))}
        <Button size="sm" tone="outline" onClick={addHeader}>
          + Header
        </Button>
      </div>
    </div>
  );

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
              description={t("webhooks.description")}
              headers={columns.map((c) => c.header)}
              heading={t("common.noData")}
            />
          ) : (
            <DataTable<WebhookRow> columns={columns} rows={rows} />
          )}
        </div>
      </section>

      {/* Create Modal */}
      <Modal
        open={createOpen}
        title={t("webhooks.createTitle")}
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
        title={t("webhooks.editTitle")}
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

      {/* Test Result Modal */}
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
              <pre style={{ background: "var(--color-bg-muted)", padding: 12, borderRadius: 6, overflow: "auto", maxHeight: 300, fontSize: "0.85em", marginTop: 4 }}>
                {testResult.response_body || "(empty)"}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
