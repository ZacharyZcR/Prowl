import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import type { User } from "@/types"
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@/hooks/useUsers"
import { useAllRoles } from "@/hooks/useRoles"
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

const EMPTY_FORM = { username: "", password: "", email: "", nickname: "", role_id: "" }

export default function Users() {
  const { t } = useTranslation()
  const { page, pageSize, setPage, search, setSearch, debouncedSearch } = useDataTable()

  const query = { page, page_size: pageSize, search: debouncedSearch || undefined }
  const { data, isLoading } = useUsers(query)
  const { data: rolesData } = useAllRoles()

  const createMut = useCreateUser()
  const updateMut = useUpdateUser()
  const deleteMut = useDeleteUser()

  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deleteUser, setDeleteUser] = useState<User | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [selectedRows, setSelectedRows] = useState<User[]>([])
  const [form, setForm] = useState(EMPTY_FORM)

  const roles = rolesData?.items ?? []

  function openCreate() {
    setForm(EMPTY_FORM)
    setCreateOpen(true)
  }

  function openEdit(user: User) {
    setForm({
      username: user.username,
      password: "",
      email: user.email,
      nickname: user.nickname,
      role_id: user.role?.id?.toString() ?? "",
    })
    setEditUser(user)
  }

  function handleCreate() {
    const payload = {
      username: form.username,
      password: form.password,
      email: form.email,
      nickname: form.nickname,
      role_id: form.role_id ? Number(form.role_id) : undefined,
    }
    createMut.mutate(payload, {
      onSuccess: () => {
        setCreateOpen(false)
        toast.success(t("users.create"))
      },
      onError: () => toast.error(t("common.operationFailed")),
    })
  }

  function handleUpdate() {
    if (!editUser) return
    const payload = {
      id: editUser.id,
      email: form.email,
      nickname: form.nickname,
      role_id: form.role_id ? Number(form.role_id) : undefined,
    }
    updateMut.mutate(payload, {
      onSuccess: () => {
        setEditUser(null)
        toast.success(t("common.save"))
      },
      onError: () => toast.error(t("common.operationFailed")),
    })
  }

  function handleDelete() {
    if (!deleteUser) return
    deleteMut.mutate(deleteUser.id, {
      onSuccess: () => {
        setDeleteUser(null)
        toast.success(t("common.delete"))
      },
      onError: () => toast.error(t("common.operationFailed")),
    })
  }

  function handleBulkDelete() {
    const ids = selectedRows.map((r) => r.id)
    let done = 0
    ids.forEach((id) =>
      deleteMut.mutate(id, {
        onSuccess: () => {
          done++
          if (done === ids.length) {
            setBulkDeleteOpen(false)
            setSelectedRows([])
            toast.success(t("common.delete"))
          }
        },
        onError: () => toast.error(t("common.operationFailed")),
      }),
    )
  }

  const columns = useMemo<ColumnDef<User, unknown>[]>(
    () => [
      {
        accessorKey: "username",
        header: t("users.username"),
      },
      {
        accessorKey: "email",
        header: t("users.email"),
      },
      {
        accessorKey: "nickname",
        header: t("users.nickname"),
      },
      {
        id: "role",
        header: t("users.role"),
        cell: ({ row }) => {
          const role = row.original.role
          return role ? (
            <Badge variant="secondary">{role.name}</Badge>
          ) : (
            <span className="text-muted-foreground">{t("users.noRole")}</span>
          )
        },
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
                onClick={() => setDeleteUser(row.original)}
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

  const formFields = (isEdit: boolean) => (
    <div className="grid gap-4 py-4">
      {!isEdit && (
        <div className="grid gap-2">
          <Label>{t("users.username")}</Label>
          <Input
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          />
        </div>
      )}
      {!isEdit && (
        <div className="grid gap-2">
          <Label>{t("users.password")}</Label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
        </div>
      )}
      <div className="grid gap-2">
        <Label>{t("users.email")}</Label>
        <Input
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
      </div>
      <div className="grid gap-2">
        <Label>{t("users.nickname")}</Label>
        <Input
          value={form.nickname}
          onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
        />
      </div>
      <div className="grid gap-2">
        <Label>{t("users.role")}</Label>
        <Select
          value={form.role_id}
          onValueChange={(v) => setForm((f) => ({ ...f, role_id: v }))}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("common.select")} />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={String(role.id)}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t("users.title")} description={t("users.description")}>
        {selectedRows.length > 0 && (
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="mr-1 size-4" />
            {t("common.delete")} ({selectedRows.length})
          </Button>
        )}
        <Button onClick={openCreate}>
          <Plus className="mr-1 size-4" />
          {t("users.create")}
        </Button>
      </PageHeader>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder={t("users.search")}
      />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        loading={isLoading}
        enableSelection
        onSelectionChange={setSelectedRows}
      />

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.createTitle")}</DialogTitle>
          </DialogHeader>
          {formFields(false)}
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
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.editTitle")}</DialogTitle>
          </DialogHeader>
          {formFields(true)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
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
        open={!!deleteUser}
        onOpenChange={(o) => !o && setDeleteUser(null)}
        title={t("users.deleteTitle")}
        description={t("users.deleteConfirm", { name: deleteUser?.username })}
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
        variant="destructive"
      />

      {/* Bulk Delete Confirm */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={t("users.deleteTitle")}
        description={t("users.deleteConfirm", {
          name: `${selectedRows.length} users`,
        })}
        onConfirm={handleBulkDelete}
        loading={deleteMut.isPending}
        variant="destructive"
      />
    </div>
  )
}
