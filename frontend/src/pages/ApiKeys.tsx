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
import {
  useApiKeys,
  useGenerateApiKey,
  useRevokeApiKey,
  type ApiKey,
  type GeneratedApiKey,
} from "@/hooks/useApiKeys";
import { PageShell } from "@/components/PageShell";
import { formatDate, formatDateTime } from "@/lib/datetime";

interface ApiKeyRow extends Record<string, ReactNode> {
  name: ReactNode;
  key_prefix: ReactNode;
  last_used: ReactNode;
  expires_at: ReactNode;
  created_at: ReactNode;
  actions: ReactNode;
}

export default function ApiKeys() {
  const { t } = useTranslation();
  const { data, error, isLoading, refetch } = useApiKeys();
  const generateMutation = useGenerateApiKey();
  const revokeMutation = useRevokeApiKey();

  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<GeneratedApiKey | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);

  async function handleGenerate() {
    if (!newKeyName.trim()) return;
    try {
      const result = await generateMutation.mutateAsync({ name: newKeyName.trim() });
      setCreateOpen(false);
      setNewKeyName("");
      setGeneratedKey(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    try {
      await revokeMutation.mutateAsync(revokeTarget.id);
      toast.success(t("apiKeys.revoked"));
      setRevokeTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  function handleCopy(text: string) {
    if (!text) {
      return;
    }

    if (!navigator.clipboard?.writeText) {
      toast.error(t("common.operationFailed"));
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      toast.success(t("apiKeys.copied"));
    }).catch(() => {
      toast.error(t("common.operationFailed"));
    });
  }

  const keys = data ?? [];

  const columns = [
    { key: "name" as const, header: t("apiKeys.name"), width: "20%" },
    { key: "key_prefix" as const, header: t("apiKeys.keyPrefix"), width: "14%" },
    { key: "last_used" as const, header: t("apiKeys.lastUsed"), width: "18%" },
    { key: "expires_at" as const, header: t("apiKeys.expiresAt"), width: "18%" },
    { key: "created_at" as const, header: t("apiKeys.createdAt"), width: "18%" },
    { key: "actions" as const, header: t("common.actions"), width: "12%", align: "right" as const },
  ];

  const rows: ApiKeyRow[] = keys.map((key) => ({
    name: key.name,
    key_prefix: <code className="stc-inline-code">{key.key_prefix}...</code>,
    last_used: formatDateTime(key.last_used_at),
    expires_at: key.expires_at ? (
      <Tag tone={new Date(key.expires_at) < new Date() ? "danger" : "neutral"}>
        {formatDate(key.expires_at)}
      </Tag>
    ) : (
      <Tag tone="neutral">{t("apiKeys.never")}</Tag>
    ),
    created_at: formatDateTime(key.created_at),
    actions: (
      <Button size="sm" tone="danger" onClick={() => setRevokeTarget(key)}>
        {t("apiKeys.revoke")}
      </Button>
    ),
  }));

  const errorMessage = error instanceof Error ? error.message : t("common.loadFailed");

  return (
    <PageShell
      title={t("apiKeys.title")}
      description={t("apiKeys.description")}
      actions={
        <Button tone="primary" onClick={() => { setNewKeyName(""); setCreateOpen(true); }}>
          {t("apiKeys.generate")}
        </Button>
      }
    >
      <section className="yza-doc-card">
        <div className="yza-doc-stack">
          {isLoading ? (
            <>
              <Skeleton variant="rect" height={44} />
              <Skeleton count={3} variant="rect" height={52} />
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
                <Button tone="outline" onClick={() => { setNewKeyName(""); setCreateOpen(true); }}>
                  {t("apiKeys.generate")}
                </Button>
              }
              description={t("apiKeys.emptyDescription")}
              headers={columns.map((c) => c.header)}
              heading={t("apiKeys.emptyTitle")}
            />
          ) : (
            <DataTable<ApiKeyRow> columns={columns} rows={rows} />
          )}
        </div>
      </section>

      {/* Generate Modal */}
      <Modal
        open={createOpen}
        title={t("apiKeys.generateTitle")}
        onClose={() => setCreateOpen(false)}
        footer={
          <div className="yza-button-row">
            <Button tone="outline" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
            <Button
              tone="primary"
              onClick={handleGenerate}
              disabled={generateMutation.isPending || !newKeyName.trim()}
              aria-busy={generateMutation.isPending}
            >
              {generateMutation.isPending ? t("apiKeys.generating") : t("apiKeys.generate")}
            </Button>
          </div>
        }
      >
        <div className="yza-doc-stack">
          <Input
            label={t("apiKeys.name")}
            value={newKeyName}
            placeholder={t("apiKeys.namePlaceholder")}
            onChange={(e) => setNewKeyName(e.target.value)}
          />
        </div>
      </Modal>

      {/* Generated Key Display Modal */}
      <Modal
        open={generatedKey !== null}
        title={t("apiKeys.generatedTitle")}
        onClose={() => setGeneratedKey(null)}
        footer={
          <div className="yza-button-row">
            <Button
              tone="outline"
              onClick={() => handleCopy(generatedKey?.key ?? "")}
              disabled={!generatedKey?.key}
            >
              {t("apiKeys.copy")}
            </Button>
            <Button tone="primary" onClick={() => setGeneratedKey(null)}>
              {t("apiKeys.understood")}
            </Button>
          </div>
        }
      >
        <div className="yza-doc-stack">
          <Alert
            heading={t("apiKeys.onceWarning")}
            description={t("apiKeys.onceWarningDesc")}
            tone="warning"
          />
          <div className="stc-copy-row">
            <code className="stc-copy-row__code">
              {generatedKey?.key}
            </code>
            <Button size="sm" tone="outline" onClick={() => handleCopy(generatedKey?.key ?? "")}>
              {t("apiKeys.copy")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revoke Modal */}
      <Modal
        open={revokeTarget !== null}
        title={t("apiKeys.revoke")}
        description={t("apiKeys.revokeConfirm", { name: revokeTarget?.name })}
        onClose={() => setRevokeTarget(null)}
        footer={
          <div className="yza-button-row">
            <Button tone="outline" onClick={() => setRevokeTarget(null)}>{t("common.cancel")}</Button>
            <Button
              tone="danger"
              onClick={handleRevoke}
              disabled={revokeMutation.isPending}
              aria-busy={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? t("apiKeys.revoking") : t("apiKeys.revoke")}
            </Button>
          </div>
        }
      />
    </PageShell>
  );
}
