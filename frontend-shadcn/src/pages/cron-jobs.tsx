import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Plus, Loader2, Play } from "lucide-react"
import { toast } from "sonner"

import {
  useCronJobs,
  useCreateCronJob,
  useUpdateCronJob,
  useDeleteCronJob,
  useToggleCronJob,
  useRunCronJob,
  type CronJob,
} from "@/hooks/useCronJobs"
import { formatDateTime } from "@/lib/datetime"

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const EMPTY_FORM = { name: "", cron_expr: "", handler: "", enabled: true }

export default function CronJobs() {
  const { t } = useTranslation()

  const { data: jobs, isLoading } = useCronJobs()
  const createMut = useCreateCronJob()
  const updateMut = useUpdateCronJob()
  const deleteMut = useDeleteCronJob()
  const toggleMut = useToggleCronJob()
  const runMut = useRunCronJob()

  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<CronJob | null>(null)
  const [deleteItem, setDeleteItem] = useState<CronJob | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditItem(null)
    setFormOpen(true)
  }

  function openEdit(job: CronJob) {
    setForm({
      name: job.name,
      cron_expr: job.cron_expr,
      handler: job.handler,
      enabled: job.enabled,
    })
    setEditItem(job)
    setFormOpen(true)
  }

  function handleSave() {
    if (editItem) {
      updateMut.mutate(
        { id: editItem.id, name: form.name, cron_expr: form.cron_expr, handler: form.handler, enabled: form.enabled },
        {
          onSuccess: () => { setFormOpen(false); toast.success(t("common.save", "Saved")) },
          onError: () => toast.error(t("common.operationFailed", "Operation failed")),
        },
      )
    } else {
      createMut.mutate(form, {
        onSuccess: () => { setFormOpen(false); toast.success(t("common.create", "Created")) },
        onError: () => toast.error(t("common.operationFailed", "Operation failed")),
      })
    }
  }

  function handleDelete() {
    if (!deleteItem) return
    deleteMut.mutate(deleteItem.id, {
      onSuccess: () => { setDeleteItem(null); toast.success(t("common.delete", "Deleted")) },
      onError: () => toast.error(t("common.operationFailed", "Operation failed")),
    })
  }

  function handleToggle(job: CronJob) {
    toggleMut.mutate(job.id, {
      onError: () => toast.error(t("common.operationFailed", "Operation failed")),
    })
  }

  function handleRun(job: CronJob) {
    runMut.mutate(job.id, {
      onSuccess: () => toast.success(t("cronJobs.runSuccess", "Job triggered")),
      onError: () => toast.error(t("common.operationFailed", "Operation failed")),
    })
  }

  const columns = useMemo<ColumnDef<CronJob, unknown>[]>(
    () => [
      { accessorKey: "name", header: t("cronJobs.name", "Name") },
      { accessorKey: "cron_expr", header: t("cronJobs.expression", "Expression") },
      {
        id: "enabled",
        header: t("cronJobs.enabled", "Enabled"),
        cell: ({ row }) => (
          <Switch
            checked={row.original.enabled}
            onCheckedChange={() => handleToggle(row.original)}
          />
        ),
      },
      {
        id: "last_status",
        header: t("cronJobs.lastStatus", "Last Status"),
        cell: ({ row }) => {
          const status = row.original.last_status
          if (!status) return <span className="text-muted-foreground">-</span>
          return (
            <Badge variant={status === "success" ? "secondary" : "destructive"}>
              {status}
            </Badge>
          )
        },
      },
      {
        accessorKey: "last_run_at",
        header: t("cronJobs.lastRun", "Last Run"),
        cell: ({ row }) => formatDateTime(row.original.last_run_at),
      },
      {
        accessorKey: "next_run_at",
        header: t("cronJobs.nextRun", "Next Run"),
        cell: ({ row }) => formatDateTime(row.original.next_run_at),
      },
      {
        id: "actions",
        header: t("common.actions", "Actions"),
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => handleRun(row.original)}
              disabled={runMut.isPending}
              title={t("cronJobs.runNow", "Run Now")}
            >
              <Play className="size-4" />
            </Button>
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
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setDeleteItem(row.original)}
                >
                  {t("common.delete", "Delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [t],
  )

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t("cronJobs.title", "Cron Jobs")}
        description={t("cronJobs.description", "Manage scheduled tasks")}
      >
        <Button onClick={openCreate}>
          <Plus className="mr-1 size-4" />
          {t("common.create", "Create")}
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={jobs ?? []}
        loading={isLoading}
      />

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editItem
                ? t("cronJobs.editTitle", "Edit Cron Job")
                : t("cronJobs.createTitle", "Create Cron Job")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("cronJobs.name", "Name")}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("cronJobs.expression", "Cron Expression")}</Label>
              <Input
                value={form.cron_expr}
                onChange={(e) => setForm((f) => ({ ...f, cron_expr: e.target.value }))}
                placeholder="*/5 * * * *"
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("cronJobs.handler", "Handler")}</Label>
              <Input
                value={form.handler}
                onChange={(e) => setForm((f) => ({ ...f, handler: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label>{t("cronJobs.enabled", "Enabled")}</Label>
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
        title={t("cronJobs.deleteTitle", "Delete Cron Job")}
        description={t("cronJobs.deleteConfirm", 'Delete "{{name}}"?', {
          name: deleteItem?.name,
        })}
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
        variant="destructive"
      />
    </div>
  )
}
