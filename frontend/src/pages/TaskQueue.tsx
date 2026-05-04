import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Button,
  DataTable,
  EmptyTable,
  KPIGroup,
  Skeleton,
  Tag,
} from "@yza/ui";
import { toast } from "sonner";
import {
  useQueueStats,
  useQueueTasks,
  useEnqueueTask,
  type QueueTask,
} from "@/hooks/useTaskQueue";
import { PageShell } from "@/components/PageShell";
import { formatDateTime } from "@/lib/datetime";

type TagTone = "success" | "danger" | "neutral" | "info" | "warning";

function statusTone(status: string): TagTone {
  switch (status) {
    case "completed": return "success";
    case "failed": return "danger";
    case "running": return "info";
    default: return "neutral";
  }
}

function formatDuration(task: QueueTask): string {
  if (!task.started_at) return "-";
  const start = new Date(task.started_at).getTime();
  const end = task.done_at ? new Date(task.done_at).getTime() : Date.now();
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function truncateId(id: string): string {
  return id.length > 16 ? id.slice(0, 16) + "..." : id;
}

interface TaskRow extends Record<string, ReactNode> {
  id: ReactNode;
  name: ReactNode;
  status: ReactNode;
  created_at: ReactNode;
  started_at: ReactNode;
  duration: ReactNode;
  error: ReactNode;
}

export default function TaskQueue() {
  const { t } = useTranslation();
  const { data: stats, isLoading: statsLoading } = useQueueStats();
  const { data: tasks, isLoading: tasksLoading, error, refetch } = useQueueTasks();
  const enqueueMutation = useEnqueueTask();

  async function handleEnqueue() {
    try {
      await enqueueMutation.mutateAsync();
      toast.success(t("taskQueue.enqueued"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  const kpis = [
    { label: t("taskQueue.workers"), value: stats?.workers ?? 0 },
    { label: t("taskQueue.pending"), value: stats?.pending ?? 0 },
    { label: t("taskQueue.running"), value: stats?.running ?? 0 },
    { label: t("taskQueue.completed"), value: stats?.completed ?? 0 },
    { label: t("taskQueue.failed"), value: stats?.failed ?? 0 },
  ];

  const columns = [
    { key: "id" as const, header: t("taskQueue.id"), width: "14%" },
    { key: "name" as const, header: t("taskQueue.name"), width: "14%" },
    { key: "status" as const, header: t("taskQueue.status"), width: "12%" },
    { key: "created_at" as const, header: t("taskQueue.createdAt"), width: "16%" },
    { key: "started_at" as const, header: t("taskQueue.startedAt"), width: "16%" },
    { key: "duration" as const, header: t("taskQueue.duration"), width: "10%" },
    { key: "error" as const, header: t("taskQueue.error"), width: "18%" },
  ];

  const taskList = tasks ?? [];

  const rows: TaskRow[] = taskList.map((task) => ({
    id: <code title={task.id} className="stc-inline-code">{truncateId(task.id)}</code>,
    name: task.name,
    status: (
      <Tag tone={statusTone(task.status)}>
        <span className={task.status === "running" ? "stc-pulse" : ""}>
          {t(`taskQueue.statuses.${task.status}`)}
        </span>
      </Tag>
    ),
    created_at: formatDateTime(task.created_at),
    started_at: formatDateTime(task.started_at),
    duration: formatDuration(task),
    error: task.error ? (
      <span title={task.error} className="stc-error-text">
        {task.error.length > 40 ? task.error.slice(0, 40) + "..." : task.error}
      </span>
    ) : "-",
  }));

  const isLoading = statsLoading || tasksLoading;
  const errorMessage = error instanceof Error ? error.message : t("common.loadFailed");

  return (
    <PageShell
      title={t("taskQueue.title")}
      description={t("taskQueue.description")}
      actions={
        <Button
          tone="primary"
          onClick={handleEnqueue}
          disabled={enqueueMutation.isPending}
          aria-busy={enqueueMutation.isPending}
        >
          {t("taskQueue.runTest")}
        </Button>
      }
    >
      <section className="yza-doc-card">
        <div className="yza-doc-stack">
          {statsLoading ? (
            <Skeleton variant="rect" height={80} />
          ) : (
            <KPIGroup items={kpis} />
          )}

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
              description={t("taskQueue.emptyDescription")}
              headers={columns.map((c) => c.header)}
              heading={t("taskQueue.emptyTitle")}
            />
          ) : (
            <DataTable<TaskRow> columns={columns} rows={rows} />
          )}
        </div>
      </section>
    </PageShell>
  );
}
