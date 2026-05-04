import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type { ColumnDef } from "@tanstack/react-table"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"

import type { Project } from "@/types"
import { useDataTable } from "@/hooks/useDataTable"
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from "@/hooks/useProjects"

import { PageHeader } from "@/components/shared/page-header"
import { FilterBar } from "@/components/shared/filter-bar"
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

const STATUS_OPTIONS = ["planning", "active", "completed", "archived"] as const

const statusBadgeVariant: Record<string, "secondary" | "default" | "outline" | "destructive"> = {
  planning: "secondary",
  active: "default",
  completed: "outline",
  archived: "destructive",
}

interface ProjectForm {
  name: string
  description: string
  status: string
}

const emptyForm: ProjectForm = { name: "", description: "", status: "planning" }

export default function Projects() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const table = useDataTable()

  const { data, isLoading } = useProjects({
    page: table.page,
    page_size: table.pageSize,
    search: table.debouncedSearch,
  })

  const createMutation = useCreateProject()
  const updateMutation = useUpdateProject()
  const deleteMutation = useDeleteProject()

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<ProjectForm>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (project: Project) => {
    setEditingId(project.id)
    setForm({
      name: project.name,
      description: project.description,
      status: project.status,
    })
    setFormOpen(true)
  }

  const handleSubmit = () => {
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, ...form },
        { onSuccess: () => setFormOpen(false) },
      )
    } else {
      createMutation.mutate(form, {
        onSuccess: () => setFormOpen(false),
      })
    }
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  const saving = createMutation.isPending || updateMutation.isPending

  const columns: ColumnDef<Project, unknown>[] = [
    {
      accessorKey: "name",
      header: t("projects.name", "Name"),
      cell: ({ row }) => (
        <button
          className="font-medium text-primary hover:underline"
          onClick={() => navigate(`/projects/${row.original.id}`)}
        >
          {row.original.name}
        </button>
      ),
    },
    {
      accessorKey: "description",
      header: t("projects.description", "Description"),
      cell: ({ row }) => (
        <span className="line-clamp-1 max-w-[300px]">
          {row.original.description || "-"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: t("projects.status", "Status"),
      cell: ({ row }) => (
        <Badge variant={statusBadgeVariant[row.original.status] ?? "secondary"}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "owner_name",
      header: t("projects.owner", "Owner"),
    },
    {
      accessorKey: "created_at",
      header: t("common.createdAt", "Created At"),
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
    },
    {
      id: "actions",
      header: t("common.actions", "Actions"),
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => openEdit(row.original)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setDeleteTarget(row.original)}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t("projects.title", "Projects")}>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          {t("projects.create", "Create Project")}
        </Button>
      </PageHeader>

      <FilterBar
        search={table.search}
        onSearchChange={table.setSearch}
        placeholder={t("projects.searchPlaceholder", "Search projects...")}
      />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        loading={isLoading}
      />

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t("projects.edit", "Edit Project")
                : t("projects.create", "Create Project")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("projects.name", "Name")}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("projects.description", "Description")}</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("projects.status", "Status")}</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !form.name}>
              {saving && <Loader2 className="animate-spin" />}
              {t("common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("projects.deleteTitle", "Delete Project")}
        description={t(
          "projects.deleteDescription",
          'Are you sure you want to delete "{{name}}"?',
          { name: deleteTarget?.name },
        )}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  )
}
