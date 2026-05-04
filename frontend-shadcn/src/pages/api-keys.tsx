import { useState, useMemo, useCallback } from "react"
import { useTranslation } from "react-i18next"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Copy, Check } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  useApiKeys,
  useGenerateApiKey,
  useRevokeApiKey,
  type ApiKey,
  type GeneratedApiKey,
} from "@/hooks/useApiKeys"
import { formatDateTime } from "@/lib/datetime"

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <Button variant="ghost" size="icon" className="size-7" onClick={handleCopy}>
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </Button>
  )
}

export default function ApiKeys() {
  const { t } = useTranslation()

  const { data: keys, isLoading } = useApiKeys()
  const generateMut = useGenerateApiKey()
  const revokeMut = useRevokeApiKey()

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [generatedKey, setGeneratedKey] = useState<GeneratedApiKey | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)

  function openCreate() {
    setName("")
    setCreateOpen(true)
  }

  function handleGenerate() {
    generateMut.mutate(
      { name },
      {
        onSuccess: (data) => {
          setCreateOpen(false)
          setGeneratedKey(data)
          toast.success(t("apiKeys.generated", "API key generated"))
        },
        onError: () => toast.error(t("common.operationFailed", "Operation failed")),
      },
    )
  }

  function handleRevoke() {
    if (!revokeTarget) return
    revokeMut.mutate(revokeTarget.id, {
      onSuccess: () => {
        setRevokeTarget(null)
        toast.success(t("apiKeys.revoked", "API key revoked"))
      },
      onError: () => toast.error(t("common.operationFailed", "Operation failed")),
    })
  }

  const columns = useMemo<ColumnDef<ApiKey, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("apiKeys.name", "Name"),
      },
      {
        accessorKey: "key_prefix",
        header: t("apiKeys.key", "Key"),
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {row.original.key_prefix}...
            </code>
            <CopyButton text={row.original.key_prefix} />
          </div>
        ),
      },
      {
        accessorKey: "enabled",
        header: t("apiKeys.status", "Status"),
        cell: ({ row }) =>
          row.original.enabled ? (
            <Badge variant="default">{t("apiKeys.active", "Active")}</Badge>
          ) : (
            <Badge variant="secondary">{t("apiKeys.disabled", "Disabled")}</Badge>
          ),
      },
      {
        accessorKey: "created_at",
        header: t("common.createdAt", "Created At"),
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        accessorKey: "last_used_at",
        header: t("apiKeys.lastUsed", "Last Used"),
        cell: ({ row }) =>
          row.original.last_used_at
            ? formatDateTime(row.original.last_used_at)
            : <span className="text-muted-foreground">-</span>,
      },
      {
        id: "actions",
        header: t("common.actions", "Actions"),
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setRevokeTarget(row.original)}
          >
            {t("apiKeys.revoke", "Revoke")}
          </Button>
        ),
      },
    ],
    [t],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("apiKeys.title", "API Keys")}
        description={t("apiKeys.description", "Manage API access keys")}
      >
        <Button onClick={openCreate}>
          <Plus className="mr-1 size-4" />
          {t("apiKeys.generate", "Generate Key")}
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={keys ?? []}
        loading={isLoading}
      />

      {/* Generate Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("apiKeys.generateTitle", "Generate API Key")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("apiKeys.name", "Name")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("apiKeys.namePlaceholder", "e.g. CI/CD Pipeline")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!name.trim() || generateMut.isPending}
            >
              {t("apiKeys.generate", "Generate Key")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated Key Display Dialog */}
      <Dialog
        open={!!generatedKey}
        onOpenChange={(o) => !o && setGeneratedKey(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("apiKeys.keyGenerated", "Key Generated")}</DialogTitle>
            <DialogDescription>
              {t(
                "apiKeys.copyWarning",
                "Copy this key now. You will not be able to see it again.",
              )}
            </DialogDescription>
          </DialogHeader>
          {generatedKey && (
            <div className="space-y-3 py-4">
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">
                  {t("apiKeys.name", "Name")}
                </Label>
                <p className="text-sm font-medium">{generatedKey.name}</p>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">
                  {t("apiKeys.key", "Key")}
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded bg-muted px-3 py-2 text-sm font-mono">
                    {generatedKey.key}
                  </code>
                  <CopyButton text={generatedKey.key} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setGeneratedKey(null)}>
              {t("common.close", "Close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirm */}
      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
        title={t("apiKeys.revokeTitle", "Revoke API Key")}
        description={t(
          "apiKeys.revokeConfirm",
          'Are you sure you want to revoke "{{name}}"? This action cannot be undone.',
          { name: revokeTarget?.name },
        )}
        onConfirm={handleRevoke}
        loading={revokeMut.isPending}
        variant="destructive"
      />
    </div>
  )
}
