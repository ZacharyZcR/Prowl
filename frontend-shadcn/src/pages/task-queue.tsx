import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { ColumnDef } from "@tanstack/react-table"
import {
  RefreshCw,
  Clock,
  Play,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  useQueueStats,
  useQueueTasks,
  type QueueTask,
} from "@/hooks/useTaskQueue"
import { formatDateTime } from "@/lib/datetime"

const STATUS_MAP: Record<
  QueueTask["status"],
  { variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof Clock }
> = {
  pending: { variant: "secondary", icon: Clock },
  running: { variant: "default", icon: Play },
  completed: { variant: "outline", icon: CheckCircle2 },
  failed: { variant: "destructive", icon: XCircle },
}

export default function TaskQueue() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const { data: stats } = useQueueStats()
  const { data: tasks, isLoading } = useQueueTasks()

  function handleRefresh() {
    qc.invalidateQueries({ queryKey: ["queue"] })
  }

  const columns = useMemo<ColumnDef<QueueTask, unknown>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.id.slice(0, 8)}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: t("taskQueue.name", "Task Name"),
      },
      {
        accessorKey: "status",
        header: t("taskQueue.status", "Status"),
        cell: ({ row }) => {
          const s = row.original.status
          const cfg = STATUS_MAP[s]
          const Icon = cfg.icon
          return (
            <Badge variant={cfg.variant} className="gap-1">
              <Icon className="size-3" />
              {s}
            </Badge>
          )
        },
      },
      {
        accessorKey: "error",
        header: t("taskQueue.error", "Error"),
        cell: ({ row }) => {
          const err = row.original.error
          if (!err) return <span className="text-muted-foreground">-</span>
          return (
            <span className="max-w-[200px] truncate text-xs text-destructive" title={err}>
              {err}
            </span>
          )
        },
      },
      {
        accessorKey: "created_at",
        header: t("common.createdAt", "Created At"),
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        accessorKey: "done_at",
        header: t("taskQueue.doneAt", "Done At"),
        cell: ({ row }) =>
          row.original.done_at
            ? formatDateTime(row.original.done_at)
            : <span className="text-muted-foreground">-</span>,
      },
    ],
    [t],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("taskQueue.title", "Task Queue")}
        description={t("taskQueue.description", "Monitor background task execution")}
      >
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-1 size-4" />
          {t("common.refresh", "Refresh")}
        </Button>
      </PageHeader>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t("taskQueue.pending", "Pending")}
            value={stats.pending}
            icon={<Clock className="size-5" />}
          />
          <StatCard
            title={t("taskQueue.running", "Running")}
            value={stats.running}
            icon={<Play className="size-5" />}
          />
          <StatCard
            title={t("taskQueue.completed", "Completed")}
            value={stats.completed}
            icon={<CheckCircle2 className="size-5" />}
          />
          <StatCard
            title={t("taskQueue.failed", "Failed")}
            value={stats.failed}
            icon={<XCircle className="size-5" />}
          />
        </div>
      )}

      <DataTable
        columns={columns}
        data={tasks ?? []}
        loading={isLoading}
      />
    </div>
  )
}
