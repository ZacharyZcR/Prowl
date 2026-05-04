import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  useAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  usePublishAnnouncement,
  useUnpublishAnnouncement,
  type Announcement,
} from "@/hooks/useAnnouncements"
import { formatDateTime } from "@/lib/datetime"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const PRIORITIES = ["info", "warning", "critical"] as const

const PRIORITY_VARIANT: Record<string, "secondary" | "default" | "destructive"> = {
  info: "secondary",
  warning: "default",
  critical: "destructive",
}

const EMPTY_FORM = { title: "", content: "", priority: "info" as string, expires_at: "" }

export default function Announcements() {
  const { t } = useTranslation()

  const { data: announcements, isLoading } = useAnnouncements()
  const createMut = useCreateAnnouncement()
  const updateMut = useUpdateAnnouncement()
  const deleteMut = useDeleteAnnouncement()
  const publishMut = usePublishAnnouncement()
  const unpublishMut = useUnpublishAnnouncement()

  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<Announcement | null>(null)
  const [deleteItem, setDeleteItem] = useState<Announcement | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditItem(null)
    setFormOpen(true)
  }

  function openEdit(a: Announcement) {
    setForm({
      title: a.title,
      content: a.content,
      priority: a.priority,
      expires_at: a.expires_at ? a.expires_at.slice(0, 16) : "",
    })
    setEditItem(a)
    setFormOpen(true)
  }

  function handleSave() {
    const payload = {
      title: form.title,
      content: form.content,
      priority: form.priority,
      expires_at: form.expires_at || undefined,
    }
    if (editItem) {
      updateMut.mutate(
        { id: editItem.id, ...payload },
        {
          onSuccess: () => { setFormOpen(false); toast.success(t("common.save", "Saved")) },
          onError: () => toast.error(t("common.operationFailed", "Operation failed")),
        },
      )
    } else {
      createMut.mutate(payload, {
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

  function handlePublish(a: Announcement) {
    publishMut.mutate(a.id, {
      onSuccess: () => toast.success(t("announcements.published", "Published")),
      onError: () => toast.error(t("common.operationFailed", "Operation failed")),
    })
  }

  function handleUnpublish(a: Announcement) {
    unpublishMut.mutate(a.id, {
      onSuccess: () => toast.success(t("announcements.unpublished", "Unpublished")),
      onError: () => toast.error(t("common.operationFailed", "Operation failed")),
    })
  }

  const columns = useMemo<ColumnDef<Announcement, unknown>[]>(
    () => [
      { accessorKey: "title", header: t("announcements.titleField", "Title") },
      {
        id: "priority",
        header: t("announcements.priority", "Priority"),
        cell: ({ row }) => (
          <Badge variant={PRIORITY_VARIANT[row.original.priority] ?? "secondary"}>
            {row.original.priority}
          </Badge>
        ),
      },
      {
        id: "status",
        header: t("announcements.status", "Status"),
        cell: ({ row }) =>
          row.original.published ? (
            <Badge variant="default">{t("announcements.published", "Published")}</Badge>
          ) : (
            <Badge variant="outline">{t("announcements.draft", "Draft")}</Badge>
          ),
      },
      {
        accessorKey: "created_at",
        header: t("announcements.createdAt", "Created"),
        cell: ({ row }) => formatDateTime(row.original.created_at),
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
              {row.original.published ? (
                <DropdownMenuItem onClick={() => handleUnpublish(row.original)}>
                  {t("announcements.unpublish", "Unpublish")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handlePublish(row.original)}>
                  {t("announcements.publish", "Publish")}
                </DropdownMenuItem>
              )}
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
        title={t("announcements.title", "Announcements")}
        description={t("announcements.description", "Manage system announcements")}
      >
        <Button onClick={openCreate}>
          <Plus className="mr-1 size-4" />
          {t("common.create", "Create")}
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={announcements ?? []}
        loading={isLoading}
      />

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editItem
                ? t("announcements.editTitle", "Edit Announcement")
                : t("announcements.createTitle", "Create Announcement")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("announcements.titleField", "Title")}</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("announcements.content", "Content")}</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={5}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("announcements.priority", "Priority")}</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("announcements.expiresAt", "Expires At")}</Label>
              <Input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
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
        title={t("announcements.deleteTitle", "Delete Announcement")}
        description={t("announcements.deleteConfirm", 'Delete "{{name}}"?', {
          name: deleteItem?.title,
        })}
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
        variant="destructive"
      />
    </div>
  )
}
