import { useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Button,
  DataTable,
  EmptyTable,
  Modal,
  Pagination,
  Skeleton,
} from "@yza/ui";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { useFiles, useUploadFile, useDeleteFile } from "@/hooks/useFiles";
import { usePageBounds } from "@/hooks/usePageBounds";
import { usePagination } from "@/hooks/usePagination";
import { PageShell } from "@/components/PageShell";
import { useAuthStore } from "@/stores/auth";
import { formatDate } from "@/lib/datetime";
import { buildApiUrl } from "@/lib/server-url";
import type { FileItem } from "@/types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}

interface FileRow extends Record<string, ReactNode> {
  name: ReactNode;
  size: ReactNode;
  mime_type: ReactNode;
  uploader: ReactNode;
  created_at: ReactNode;
  actions: ReactNode;
}

export default function Files() {
  const { t } = useTranslation();
  const { can } = usePermission();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const canUpload = can("upload:create");

  const pagination = usePagination(10);
  const { data, error, isLoading, refetch } = useFiles({
    page: pagination.page,
    page_size: pagination.pageSize,
  });

  const uploadMutation = useUploadFile();
  const deleteMutation = useDeleteFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadMutation.mutateAsync(file);
      toast.success(t("files.uploadSuccess"));
    } catch {
      toast.error(t("files.uploadFailed"));
    }
    e.target.value = "";
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t("files.deleteSuccess"));
      setDeleteTarget(null);
    } catch {
      toast.error(t("files.deleteFailed"));
    }
  }

  const files = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;
  usePageBounds(pagination.page, totalPages, pagination.setPage);

  const columns = [
    { key: "name" as const, header: t("files.name"), width: "30%" },
    { key: "size" as const, header: t("files.size"), width: "12%" },
    { key: "mime_type" as const, header: t("files.mimeType"), width: "15%" },
    { key: "uploader" as const, header: t("files.uploader"), width: "13%" },
    { key: "created_at" as const, header: t("files.time"), width: "15%" },
    { key: "actions" as const, header: t("common.actions"), width: "10%", align: "right" as const },
  ];

  const rows: FileRow[] = files.map((file) => ({
    name: (
      <a
        href={buildApiUrl(file.url)}
        target="_blank"
        rel="noopener noreferrer"
        className="stc-text-link"
      >
        {file.name}
      </a>
    ),
    size: formatFileSize(file.size),
    mime_type: file.mime_type,
    uploader: file.uploader_name,
    created_at: formatDate(file.created_at),
    actions: (
      <div className="yza-button-row">
        {canUpload && currentUserId === file.uploader_id && (
          <Button size="sm" tone="danger" onClick={() => setDeleteTarget(file)}>
            {t("files.delete")}
          </Button>
        )}
      </div>
    ),
  }));

  const errorMessage = error instanceof Error ? error.message : t("common.loadFailed");

  return (
    <PageShell
      title={t("files.title")}
      description={t("files.description")}
      actions={
        canUpload ? (
          <div className="stc-page-actions">
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={handleFileChange}
            />
            <Button
              tone="primary"
              onClick={handleUploadClick}
              disabled={uploadMutation.isPending}
              aria-busy={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? t("files.uploading") : t("files.upload")}
            </Button>
          </div>
        ) : undefined
      }
    >
      <section className="yza-doc-card">
        <div className="yza-doc-stack">
          {isLoading ? (
            <>
              <Skeleton variant="rect" height={44} />
              <Skeleton count={5} variant="rect" height={52} />
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
                canUpload ? (
                  <Button
                    tone="outline"
                    onClick={handleUploadClick}
                    disabled={uploadMutation.isPending}
                  >
                    {t("files.upload")}
                  </Button>
                ) : undefined
              }
              description={t("files.emptyDescription")}
              headers={columns.map((c) => c.header)}
              heading={t("files.emptyTitle")}
            />
          ) : (
            <>
              <DataTable<FileRow> columns={columns} rows={rows} />
              {totalPages > 1 && (
                <Pagination
                  page={pagination.page}
                  totalPages={totalPages}
                  onPageChange={pagination.setPage}
                />
              )}
            </>
          )}
        </div>
      </section>

      <Modal
        open={deleteTarget !== null}
        title={t("files.delete")}
        description={t("files.deleteConfirm", { name: deleteTarget?.name })}
        onClose={() => setDeleteTarget(null)}
        footer={
          <div className="yza-button-row">
            <Button tone="outline" onClick={() => setDeleteTarget(null)}>{t("common.cancel")}</Button>
            <Button
              tone="danger"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              aria-busy={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t("files.deleting") : t("common.delete")}
            </Button>
          </div>
        }
      />
    </PageShell>
  );
}
