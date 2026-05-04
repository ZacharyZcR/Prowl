import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  useDicts,
  useCreateDict,
  useUpdateDict,
  useDeleteDict,
  useToggleDict,
  type DictItem,
} from "@/hooks/useDicts"

import { PageHeader } from "@/components/shared/page-header"
import { FilterBar } from "@/components/shared/filter-bar"
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

const EMPTY_FORM = { group_name: "", key: "", label: "", value: "", sort_order: 0 }

export default function Dictionaries() {
  const { t } = useTranslation()

  const { data: items, isLoading } = useDicts()
  const createMut = useCreateDict()
  const updateMut = useUpdateDict()
  const deleteMut = useDeleteDict()
  const toggleMut = useToggleDict()

  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<DictItem | null>(null)
  const [deleteItem, setDeleteItem] = useState<DictItem | null>(null)
  const [search, setSearch] = useState("")
  const [form, setForm] = useState(EMPTY_FORM)

  const filtered = useMemo(() => {
    if (!items) return []
    if (!search) return items
    const s = search.toLowerCase()
    return items.filter(
      (d) =>
        d.key.toLowerCase().includes(s) ||
        d.label.toLowerCase().includes(s) ||
        d.group_name.toLowerCase().includes(s),
    )
  }, [items, search])

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditItem(null)
    setFormOpen(true)
  }

  function openEdit(d: DictItem) {
    setForm({
      group_name: d.group_name,
      key: d.key,
      label: d.label,
      value: d.value,
      sort_order: d.sort_order,
    })
    setEditItem(d)
    setFormOpen(true)
  }

  function handleSave() {
    if (editItem) {
      updateMut.mutate(
        { id: editItem.id, ...form },
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

  function handleToggle(d: DictItem) {
    toggleMut.mutate(d.id, {
      onError: () => toast.error(t("common.operationFailed", "Operation failed")),
    })
  }

  const columns = useMemo<ColumnDef<DictItem, unknown>[]>(
    () => [
      { accessorKey: "key", header: t("dictionaries.key", "Key") },
      { accessorKey: "label", header: t("dictionaries.label", "Label") },
      { accessorKey: "value", header: t("dictionaries.value", "Value") },
      {
        id: "group_name",
        header: t("dictionaries.groupName", "Group"),
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.group_name}</Badge>
        ),
      },
      {
        id: "enabled",
        header: t("dictionaries.enabled", "Enabled"),
        cell: ({ row }) => (
          <Switch
            checked={row.original.enabled}
            onCheckedChange={() => handleToggle(row.original)}
          />
        ),
      },
      {
        accessorKey: "sort_order",
        header: t("dictionaries.sortOrder", "Sort"),
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
        title={t("dictionaries.title", "Data Dictionaries")}
        description={t("dictionaries.description", "Manage dictionary entries")}
      >
        <Button onClick={openCreate}>
          <Plus className="mr-1 size-4" />
          {t("common.create", "Create")}
        </Button>
      </PageHeader>

      <FilterBar search={search} onSearchChange={setSearch} />

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
      />

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editItem
                ? t("dictionaries.editTitle", "Edit Dictionary Item")
                : t("dictionaries.createTitle", "Create Dictionary Item")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("dictionaries.groupName", "Group")}</Label>
              <Input
                value={form.group_name}
                onChange={(e) => setForm((f) => ({ ...f, group_name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("dictionaries.key", "Key")}</Label>
              <Input
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("dictionaries.label", "Label")}</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("dictionaries.value", "Value")}</Label>
              <Input
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("dictionaries.sortOrder", "Sort Order")}</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
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
        title={t("dictionaries.deleteTitle", "Delete Dictionary Item")}
        description={t("dictionaries.deleteConfirm", 'Delete "{{name}}"?', {
          name: deleteItem?.key,
        })}
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
        variant="destructive"
      />
    </div>
  )
}
