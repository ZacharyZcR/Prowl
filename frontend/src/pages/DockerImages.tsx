import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, DataTable, Input, Modal, Skeleton, Tag } from "@yza/ui";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageShell } from "@/components/PageShell";

interface DockerImage {
  id: string;
  tags: string[];
  size: number;
  created: number;
}

function useDockerImages() {
  return useQuery({
    queryKey: ["docker-images"],
    queryFn: () => api.get<DockerImage[]>("/api/v1/admin/docker/images").then((r) => r.data),
  });
}

function usePullImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (image: string) => api.post("/api/v1/admin/docker/images/pull", { image }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["docker-images"] }),
  });
}

function useRemoveImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) => api.delete(`/api/v1/admin/docker/images/${imageId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["docker-images"] }),
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

interface ImageRow extends Record<string, ReactNode> {
  tags: ReactNode;
  id: ReactNode;
  size: ReactNode;
  created: ReactNode;
  actions: ReactNode;
}

export default function DockerImages() {
  const { t } = useTranslation();
  const { data: images, isLoading, error, refetch } = useDockerImages();
  const pullMutation = usePullImage();
  const removeMutation = useRemoveImage();
  const [pullOpen, setPullOpen] = useState(false);
  const [pullInput, setPullInput] = useState("");

  async function handlePull() {
    if (!pullInput.trim()) return;
    try {
      await pullMutation.mutateAsync(pullInput.trim());
      toast.success(`镜像 ${pullInput} 拉取完成`);
      setPullOpen(false);
      setPullInput("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "拉取失败");
    }
  }

  async function handleRemove(imageId: string) {
    try {
      await removeMutation.mutateAsync(imageId);
      toast.success("镜像已删除");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除失败");
    }
  }

  const columns = [
    { key: "tags" as const, header: "镜像标签", width: "35%" },
    { key: "id" as const, header: "ID", width: "15%" },
    { key: "size" as const, header: "大小", width: "15%" },
    { key: "created" as const, header: "创建时间", width: "20%" },
    { key: "actions" as const, header: t("common.actions"), width: "15%", align: "right" as const },
  ];

  const rows: ImageRow[] = (images ?? []).map((img) => ({
    tags: (
      <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
        {img.tags.map((tag) => <Tag key={tag} tone="info">{tag}</Tag>)}
      </div>
    ),
    id: <code style={{ fontSize: "0.75rem" }}>{img.id}</code>,
    size: formatSize(img.size),
    created: new Date(img.created * 1000).toLocaleDateString(),
    actions: (
      <Button size="sm" tone="danger" onClick={() => handleRemove(img.id)} disabled={removeMutation.isPending}>
        {t("common.delete")}
      </Button>
    ),
  }));

  return (
    <PageShell
      title="Docker 镜像"
      description="管理本地 Docker 镜像，用于动态题目容器。"
      actions={<Button tone="primary" onClick={() => setPullOpen(true)}>拉取镜像</Button>}
    >
      <section className="yza-doc-card stc-table-card">
        <div className="yza-doc-stack">
          {isLoading ? (
            <><Skeleton variant="rect" height={44} /><Skeleton count={3} variant="rect" height={52} /></>
          ) : error ? (
            <><Alert heading={t("common.loadFailed")} description="Docker 服务不可用或未连接" tone="danger" /><div><Button tone="outline" onClick={() => { void refetch(); }}>{t("common.retry")}</Button></div></>
          ) : rows.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>暂无本地镜像，点击「拉取镜像」开始。</div>
          ) : (
            <DataTable<ImageRow> columns={columns} rows={rows} />
          )}
        </div>
      </section>

      <Modal open={pullOpen} title="拉取 Docker 镜像" onClose={() => setPullOpen(false)}
        footer={
          <div className="yza-button-row">
            <Button tone="outline" onClick={() => setPullOpen(false)}>{t("common.cancel")}</Button>
            <Button tone="primary" onClick={() => { void handlePull(); }} disabled={pullMutation.isPending}>
              {pullMutation.isPending ? "拉取中..." : "拉取"}
            </Button>
          </div>
        }
      >
        <Input
          label="镜像名称"
          placeholder="例如 nginx:latest 或 ctfhub/web_ssrf"
          value={pullInput}
          onChange={(e) => setPullInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void handlePull(); }}
        />
      </Modal>
    </PageShell>
  );
}
