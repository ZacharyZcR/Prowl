import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Plus } from "lucide-react"
import { toast } from "sonner"

import type { Role } from "@/types"
import { useRoles, useCreateRole, useUpdateRole, useDeleteRole } from "@/hooks/useRoles"
import { usePermissionCategories } from "@/hooks/usePermissions"
import { useDataTable } from "@/hooks/useDataTable"
import { formatDateTime } from "@/lib/datetime"

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
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface RoleForm {
  name: string
  description: string
  permissions: string[]
}

const EMPTY_FORM: RoleForm = { name: "", description: "", permissions: [] }

export default function Roles() {
  const { t } = useTranslation()
  const { page, pageSize, setPage, search, setSearch, debouncedSearch } = useDataTable()

  const query = { page, page_size: pageSize, search: debouncedSearch || undefined }
  const { data, isLoading } = useRoles(query)
  const { data: categories } = usePermissionCategories()

  const createMut = useCreateRole()
  const updateMut = useUpdateRole()
  const deleteMut = useDeleteRole()

  const [createOpen, setCreateOpen] = useState(false)
  const [editRole, setEditRole] = useState<Role | null>(null)
  const [deleteRole, setDeleteRole] = useState<Role | null>(null)
  const [form, setForm] = useState<RoleForm>(EMPTY_FORM)

  function openCreate() {
    setForm(EMPTY_FORM)
    setCreateOpen(true)
  }

  function openEdit(role: Role) {
    setForm({
      name: role.name,
      description: role.description,
      permissions: [...role.permissions],
    })
    setEditRole(role)
  }

  function togglePermission(code: string) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(code)
        ? f.permissions.filter((p) => p !== code)
        : [...f.permissions, code],
    }))
  }

  function handleCreate() {
    createMut.mutate(
      { name: form.name, description: form.description, permissions: form.permissions },
      {
        onSuccess: () => {
          setCreateOpen(false)
          toast.success(t("roles.create"))
        },
        onError: () => toast.error(t("common.operationFailed")),
      },
    )
  }

  function handleUpdate() {
    if (!editRole) return
    updateMut.mutate(
      {
        id: editRole.id,
        name: form.name,
        description: form.description,
        permissions: form.permissions,
      },
      {
        onSuccess: () => {
          setEditRole(null)
          toast.success(t("common.save"))
        },
        onError: () => toast.error(t("common.operationFailed")),
      },
    )
  }

  function handleDelete() {
    if (!deleteRole) return
    deleteMut.mutate(deleteRole.id, {
      onSuccess: () => {
        setDeleteRole(null)
        toast.success(t("common.delete"))
      },
      onError: () => toast.error(t("common.operationFailed")),
    })
  }

  const columns = useMemo<ColumnDef<Role, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("roles.name"),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "description",
        header: t("roles.description"),
      },
      {
        id: "permissions",
        header: t("roles.permissions"),
        cell: ({ row }) => (
          <Badge variant="outline">
            {t("permissions.nPermissions", { n: row.original.permissions?.length ?? 0 })}
          </Badge>
        ),
      },
      {
        accessorKey: "user_count",
        header: t("roles.userCount"),
        cell: ({ row }) => row.original.user_count ?? 0,
      },
      {
        accessorKey: "created_at",
        header: t("users.createdAt"),
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        id: "actions",
        header: t("common.actions"),
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(row.original)}>
                {t("common.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteRole(row.original)}
              >
                {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t],
  )

  const permissionGrid = (
    <ScrollArea className="h-64 rounded-md border p-4">
      {categories?.map((cat) => (
        <div key={cat.category} className="mb-4">
          <h4 className="mb-2 text-sm font-semibold capitalize">{cat.category}</h4>
          <div className="grid grid-cols-2 gap-2">
            {cat.permissions.map((perm) => (
              <label
                key={perm.code}
                className="flex items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={form.permissions.includes(perm.code)}
                  onCheckedChange={() => togglePermission(perm.code)}
                />
                <span>{perm.name || perm.code}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </ScrollArea>
  )

  const formFields = (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label>{t("roles.name")}</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div className="grid gap-2">
        <Label>{t("roles.description")}</Label>
        <Input
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>
      <div className="grid gap-2">
        <Label>{t("roles.permissions")}</Label>
        {permissionGrid}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t("roles.title")} description={t("roles.descriptionLong")}>
        <Button onClick={openCreate}>
          <Plus className="mr-1 size-4" />
          {t("roles.create")}
        </Button>
      </PageHeader>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder={t("roles.search")}
      />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        loading={isLoading}
      />

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("roles.createTitle")}</DialogTitle>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editRole} onOpenChange={(o) => !o && setEditRole(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("roles.editTitle")}</DialogTitle>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRole(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleUpdate} disabled={updateMut.isPending}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteRole}
        onOpenChange={(o) => !o && setDeleteRole(null)}
        title={t("roles.deleteTitle")}
        description={t("roles.deleteConfirm", { name: deleteRole?.name })}
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
        variant="destructive"
      />
    </div>
  )
}
