import { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Activity as ActivityIcon, CalendarDays, Users } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { DataTable } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useActivities, useActivityStats } from "@/hooks/useActivities";
import { useDataTable } from "@/hooks/useDataTable";
import { formatDateTime } from "@/lib/datetime";
import { api } from "@/lib/api";
import type { Activity } from "@/types";

const ACTION_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  create: "default",
  update: "secondary",
  delete: "outline",
};

export default function Activities() {
  const { t } = useTranslation();
  const { page, pageSize, setPage, search, setSearch, debouncedSearch } =
    useDataTable();

  const { data, isLoading } = useActivities({
    page,
    page_size: pageSize,
    action: debouncedSearch || undefined,
  });

  const { data: stats } = useActivityStats();

  const handleExport = useCallback(async () => {
    const res = await api.get("/api/v1/activities/export", {
      responseType: "blob",
    });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activities-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const columns = useMemo<ColumnDef<Activity, unknown>[]>(
    () => [
      {
        accessorKey: "action",
        header: t("activities.action", "Action"),
        cell: ({ row }) => (
          <Badge variant={ACTION_VARIANT[row.original.action] ?? "secondary"}>
            {row.original.action}
          </Badge>
        ),
      },
      {
        accessorKey: "resource_type",
        header: t("activities.resourceType", "Resource Type"),
      },
      {
        accessorKey: "resource_id",
        header: t("activities.resourceId", "Resource ID"),
      },
      {
        accessorKey: "username",
        header: t("activities.username", "Username"),
      },
      {
        accessorKey: "ip",
        header: t("activities.ip", "IP"),
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
        title={t("activities.title", "Activity Logs")}
        description={t("activities.description", "System activity records")}
      >
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-1 size-4" />
          {t("common.export", "Export")}
        </Button>
      </PageHeader>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t("activities.totalActions", "Total")}
            value={stats.total}
            icon={<ActivityIcon className="size-5" />}
          />
          <StatCard
            title={t("activities.todayActions", "Today")}
            value={stats.today_count}
            icon={<CalendarDays className="size-5" />}
          />
          <StatCard
            title={t("activities.actionTypes", "Action Types")}
            value={Object.keys(stats.by_action).length}
          />
          <StatCard
            title={t("activities.activeUsers", "Active Users")}
            value={stats.by_user.length}
            icon={<Users className="size-5" />}
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
      />
    </div>
  );
}
