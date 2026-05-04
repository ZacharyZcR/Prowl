import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

import type { Webhook } from "@/types"
import {
  useWebhooks,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useToggleWebhook,
  useTestWebhook,
} from "@/hooks/useWebhooks"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const AVAILABLE_EVENTS = [
  "user.created",
  "user.updated",
  "user.deleted",
  "project.created",
  "project.updated",
  "project.deleted",
  "error.reported",
]

const EMPTY_FORM = { name: "", url: "", secret: "", events: [] as string[], enabled: true }

export default function Webhooks() {
  const { t } = useTranslation()

  const { data: webhooks, isLoading } = useWebhooks()
  const createMut = useCreateWebhook()
  const updateMut = useUpdateWebhook()
  const deleteMut = useDeleteWebhook()
  const toggleMut = useToggleWebhook()
  const testMut = useTestWebhook()

  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<Webhook | null>(null)
  const [deleteItem, setDeleteItem] = useState<Webhook | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditItem(null)
    setFormOpen(true)
  }

  function openEdit(w: Webhook) {
    setForm({
      name: w.name,
      url: w.url,
      secret: "",
      events: [...w.events],
      enabled: w.enabled,
    })
    setEditItem(w)
    setFormOpen(true)
  }

  function toggleEvent(event: string) {
    setForm((f) => ({
      ...f,
      events: f.events.includes(event)
        ? f.events.filter((e) => e !== event)
        : [...f.events, event],
    }))
  }

  function handleSave() {
    if (editItem) {
      updateMut.mutate(
        { id: editItem.id, name: form.name, url: form.url, secret: form.secret || undefined, events: form.events },
        {
          onSuccess: () => { setFormOpen(false); toast.success(t("common.save", "Saved")) },
          onError: () => toast.error(t("common.operationFailed", "Operation failed")),
        },
      )
    } else {
      createMut.mutate(
        { name: form.name, url: form.url, secret: form.secret || undefined, events: form.events },
        {
          onSuccess: () => { setFormOpen(false); toast.success(t("common.create", "Created")) },
          onError: () => toast.error(t("common.operationFailed", "Operation failed")),
        },
      )
    }
  }

  function handleDelete() {
    if (!deleteItem) return
    deleteMut.mutate(deleteItem.id, {
      onSuccess: () => { setDeleteItem(null); toast.success(t("common.delete", "Deleted")) },
      onError: () => toast.error(t("common.operationFailed", "Operation failed")),
    })
  }

  function handleToggle(w: Webhook) {
    toggleMut.mutate(w.id, {
      onError: () => toast.error(t("common.operationFailed", "Operation failed")),
    })
  }

  function handleTest(w: Webhook) {
    testMut.mutate(w.id, {
      onSuccess: (result) => {
        toast.success(t("webhooks.testSuccess", "Test sent: {{status}} ({{duration}})", {
          status: result.status_code,
          duration: result.duration,
        }))
      },
      onError: () => toast.error(t("common.operationFailed", "Operation failed")),
    })
  }

  const columns = useMemo<ColumnDef<Webhook, unknown>[]>(
    () => [
      { accessorKey: "name", header: t("webhooks.name", "Name") },
      {
        accessorKey: "url",
        header: "URL",
        cell: ({ row }) => (
          <span className="max-w-[200px] truncate block" title={row.original.url}>
            {row.original.url}
          </span>
        ),
      },
      {
        id: "events",
        header: t("webhooks.events", "Events"),
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.events.length}</Badge>
        ),
      },
      {
        id: "enabled",
        header: t("webhooks.enabled", "Enabled"),
        cell: ({ row }) => (
          <Switch
            checked={row.original.enabled}
            onCheckedChange={() => handleToggle(row.original)}
          />
        ),
      },
      {
        accessorKey: "failure_count",
        header: t("webhooks.failureCount", "Failures"),
        cell: ({ row }) => {
          const count = row.original.failure_count
          return count > 0 ? (
            <Badge variant="destructive">{count}</Badge>
          ) : (
            <span className="text-muted-foreground">0</span>
          )
        },
      },
      {
        id: "actions",
        header: t("common.actions", "Actions"),
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(row.original)}>
                {t("common.edit", "Edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTest(row.original)}>
                {t("webhooks.test", "Test")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteItem(row.original)}
              >
                {t("common.delete", "Delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t],
  )

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t("webhooks.title", "Webhooks")}
        description={t("webhooks.description", "Manage webhook endpoints")}
      >
        <Button onClick={openCreate}>
          <Plus className="mr-1 size-4" />
          {t("common.create", "Create")}
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={webhooks ?? []}
        loading={isLoading}
      />

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editItem
                ? t("webhooks.editTitle", "Edit Webhook")
                : t("webhooks.createTitle", "Create Webhook")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("webhooks.name", "Name")}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>URL</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://"
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("webhooks.secret", "Secret")}</Label>
              <Input
                type="password"
                value={form.secret}
                onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
                placeholder={editItem ? t("webhooks.secretUnchanged", "Leave blank to keep") : undefined}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("webhooks.events", "Events")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_EVENTS.map((event) => (
                  <label key={event} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.events.includes(event)}
                      onCheckedChange={() => toggleEvent(event)}
                    />
                    {event}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label>{t("webhooks.enabled", "Enabled")}</Label>
              <Switch
                checked={form.enabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {(createMut.isPending || updateMut.isPending) && (
                <Loader2 className="mr-1 size-4 animate-spin" />
              )}
              {editItem ? t("common.save", "Save") : t("common.create", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(o) => !o && setDeleteItem(null)}
        title={t("webhooks.deleteTitle", "Delete Webhook")}
        description={t("webhooks.deleteConfirm", 'Delete "{{name}}"?', {
          name: deleteItem?.name,
        })}
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
        variant="destructive"
      />
    </div>
  )
}
