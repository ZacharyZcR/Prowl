import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { ColumnDef } from "@tanstack/react-table";
import { ShieldCheck, ShieldAlert, LogIn, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { DataTable } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  useLoginLogs,
  useLoginLogStats,
  type LoginLog,
} from "@/hooks/useLoginLogs";
import { useDataTable } from "@/hooks/useDataTable";
import { formatDateTime } from "@/lib/datetime";

export default function LoginLogs() {
  const { t } = useTranslation();
  const { page, pageSize, setPage, search, setSearch, debouncedSearch } =
    useDataTable();

  const { data, isLoading } = useLoginLogs({
    page,
    page_size: pageSize,
    username: debouncedSearch || undefined,
  });

  const { data: stats } = useLoginLogStats();

  const columns = useMemo<ColumnDef<LoginLog, unknown>[]>(
    () => [
      {
        accessorKey: "username",
        header: t("loginLogs.username", "Username"),
      },
      {
        accessorKey: "ip",
        header: t("loginLogs.ip", "IP"),
      },
      {
        accessorKey: "success",
        header: t("loginLogs.status", "Status"),
        cell: ({ row }) =>
          row.original.success ? (
            <Badge variant="default">{t("loginLogs.success", "Success")}</Badge>
          ) : (
            <Badge variant="destructive">
              {t("loginLogs.failed", "Failed")}
            </Badge>
          ),
      },
      {
        accessorKey: "failure_reason",
        header: t("loginLogs.failureReason", "Failure Reason"),
        cell: ({ row }) => row.original.failure_reason || "-",
      },
      {
        accessorKey: "created_at",
        header: t("common.createdAt", "Created At"),
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
    ],
    [t],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("loginLogs.title", "Login Logs")}
        description={t("loginLogs.description", "User login history")}
      />

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t("loginLogs.total", "Total")}
            value={stats.total}
            icon={<LogIn className="size-5" />}
          />
          <StatCard
            title={t("loginLogs.todayLogins", "Today")}
            value={stats.today_count}
          />
          <StatCard
            title={t("loginLogs.successCount", "Successful")}
            value={stats.success_count}
            icon={<ShieldCheck className="size-5" />}
          />
          <StatCard
            title={t("loginLogs.successRate", "Success Rate")}
            value={`${(stats.success_rate * 100).toFixed(1)}%`}
            icon={<TrendingUp className="size-5" />}
          />
        </div>
      )}

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder={t("loginLogs.searchPlaceholder", "Search by username...")}
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
    </div>
  );
}
