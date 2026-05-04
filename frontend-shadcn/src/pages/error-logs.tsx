import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Bug, CheckCircle, XCircle } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { DataTable } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useErrorLogs,
  useErrorLogStats,
  useResolveError,
  useUnresolveError,
  useBulkResolveErrors,
} from "@/hooks/useErrorLogs";
import { useDataTable } from "@/hooks/useDataTable";
import { formatDateTime } from "@/lib/datetime";
import type { ErrorLog } from "@/types";

const SEVERITY_VARIANT: Record<
  string,
  "destructive" | "secondary" | "outline" | "default"
> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

export default function ErrorLogs() {
  const { t } = useTranslation();
  const { page, pageSize, setPage, search, setSearch, debouncedSearch } =
    useDataTable();

  const [selectedRows, setSelectedRows] = useState<ErrorLog[]>([]);

  const { data, isLoading } = useErrorLogs({
    page,
    page_size: pageSize,
    search: debouncedSearch || undefined,
  });

  const { data: stats } = useErrorLogStats();
  const resolveError = useResolveError();
  const unresolveError = useUnresolveError();
  const bulkResolve = useBulkResolveErrors();

  const handleBulkResolve = () => {
    const ids = selectedRows.filter((r) => !r.resolved).map((r) => r.id);
    if (ids.length > 0) bulkResolve.mutate(ids);
  };

  const columns = useMemo<ColumnDef<ErrorLog, unknown>[]>(
    () => [
      {
        accessorKey: "source",
        header: t("errorLogs.source", "Source"),
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.source}</Badge>
        ),
      },
      {
        accessorKey: "err_type",
        header: t("errorLogs.type", "Type"),
      },
      {
        accessorKey: "message",
        header: t("errorLogs.message", "Message"),
        cell: ({ row }) => (
          <span className="max-w-[300px] truncate block" title={row.original.message}>
            {row.original.message}
          </span>
        ),
      },
      {
        accessorKey: "severity",
        header: t("errorLogs.severity", "Severity"),
        cell: ({ row }) => (
          <Badge variant={SEVERITY_VARIANT[row.original.severity] ?? "secondary"}>
            {row.original.severity}
          </Badge>
        ),
      },
      {
        accessorKey: "resolved",
        header: t("errorLogs.resolved", "Resolved"),
        cell: ({ row }) =>
          row.original.resolved ? (
            <Badge variant="default">
              {t("errorLogs.resolvedYes", "Resolved")}
            </Badge>
          ) : (
            <Badge variant="secondary">
              {t("errorLogs.resolvedNo", "Unresolved")}
            </Badge>
          ),
      },
      {
        accessorKey: "created_at",
        header: t("common.createdAt", "Created At"),
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        id: "actions",
        header: t("common.actions", "Actions"),
        cell: ({ row }) =>
          row.original.resolved ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => unresolveError.mutate(row.original.id)}
              disabled={unresolveError.isPending}
            >
              <XCircle className="mr-1 size-4" />
              {t("errorLogs.unresolve", "Unresolve")}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resolveError.mutate(row.original.id)}
              disabled={resolveError.isPending}
            >
              <CheckCircle className="mr-1 size-4" />
              {t("errorLogs.resolve", "Resolve")}
            </Button>
          ),
      },
    ],
    [t, resolveError, unresolveError],
  );

  const unresolvedSelected = selectedRows.filter((r) => !r.resolved).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("errorLogs.title", "Error Logs")}
        description={t("errorLogs.description", "Application error tracking")}
      >
        {unresolvedSelected > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkResolve}
            disabled={bulkResolve.isPending}
          >
            <CheckCircle className="mr-1 size-4" />
            {t("errorLogs.bulkResolve", "Resolve ({{count}})", {
              count: unresolvedSelected,
            })}
          </Button>
        )}
      </PageHeader>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t("errorLogs.total", "Total")}
            value={stats.total}
            icon={<Bug className="size-5" />}
          />
          <StatCard
            title={t("errorLogs.unresolved", "Unresolved")}
            value={stats.unresolved}
            icon={<AlertTriangle className="size-5" />}
          />
          <StatCard
            title={t("errorLogs.critical", "Critical")}
            value={stats.by_severity?.critical ?? 0}
          />
          <StatCard
            title={t("errorLogs.high", "High")}
            value={stats.by_severity?.high ?? 0}
          />
        </div>
      )}

      <FilterBar search={search} onSearchChange={setSearch} />

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
    </div>
  );
}
