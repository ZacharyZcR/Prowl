import { useRef, useMemo } from "react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { ColumnDef } from "@tanstack/react-table"
import { Upload, Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

import type { FileItem } from "@/types"
import { useFiles, useUploadFile, useDeleteFile } from "@/hooks/useFiles"
import { useDataTable } from "@/hooks/useDataTable"
import { formatDateTime } from "@/lib/datetime"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

export default function Files() {
  const { t } = useTranslation()
  const { page, pageSize, setPage } = useDataTable()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const query = { page, page_size: pageSize }
  const { data, isLoading } = useFiles(query)
  const uploadMut = useUploadFile()
  const deleteMut = useDeleteFile()

  const [deleteItem, setDeleteItem] = useState<FileItem | null>(null)

  function handleUploadClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    uploadMut.mutate(file, {
      onSuccess: () => toast.success(t("files.uploadSuccess", "File uploaded")),
      onError: () => toast.error(t("common.operationFailed", "Operation failed")),
    })
    e.target.value = ""
  }

  function handleDelete() {
    if (!deleteItem) return
    deleteMut.mutate(deleteItem.id, {
      onSuccess: () => { setDeleteItem(null); toast.success(t("common.delete", "Deleted")) },
      onError: () => toast.error(t("common.operationFailed", "Operation failed")),
    })
  }

  function handleDownload(file: FileItem) {
    window.open(file.url, "_blank")
  }

  const columns = useMemo<ColumnDef<FileItem, unknown>[]>(
    () => [
      { accessorKey: "name", header: t("files.filename", "Filename") },
      {
        id: "size",
        header: t("files.size", "Size"),
        cell: ({ row }) => formatSize(row.original.size),
      },
      {
        id: "mime_type",
        header: t("files.mimeType", "Type"),
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.mime_type}</Badge>
        ),
      },
      {
        id: "uploader",
        header: t("files.uploader", "Uploader"),
        cell: ({ row }) => row.original.uploader_name || "-",
      },
      {
        accessorKey: "created_at",
        header: t("files.createdAt", "Created"),
        cell: ({ row }) => formatDateTime(row.original.created_at),
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
              onClick={() => handleDownload(row.original)}
              title={t("files.download", "Download")}
            >
              <Download className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive"
              onClick={() => setDeleteItem(row.original)}
              title={t("common.delete", "Delete")}
            >
              <span className="sr-only">{t("common.delete", "Delete")}</span>
              &times;
            </Button>
          </div>
        ),
      },
    ],
    [t],
  )

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t("files.title", "Files")}
        description={t("files.description", "Manage uploaded files")}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button onClick={handleUploadClick} disabled={uploadMut.isPending}>
          {uploadMut.isPending ? (
            <Loader2 className="mr-1 size-4 animate-spin" />
          ) : (
            <Upload className="mr-1 size-4" />
          )}
          {t("files.upload", "Upload")}
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        loading={isLoading}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(o) => !o && setDeleteItem(null)}
        title={t("files.deleteTitle", "Delete File")}
        description={t("files.deleteConfirm", 'Delete "{{name}}"?', {
          name: deleteItem?.name,
        })}
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
        variant="destructive"
      />
    </div>
  )
}
