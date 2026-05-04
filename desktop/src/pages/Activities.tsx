import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Button,
  DataTable,
  EmptyTable,
  FilterBar,
  FilterSummary,
  Input,
  KPIGroup,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Tag,
} from "@yza/ui";
import { toast } from "sonner";
import { useActivities, useActivityStats } from "@/hooks/useActivities";
import { useDataTable } from "@/hooks/useDataTable";
import { useAuthStore } from "@/stores/auth";
import { useConnectionStore } from "@/stores/connection";
import { PageShell } from "@/components/PageShell";
import { buildApiUrl } from "@/lib/request-url";
import type { Activity } from "@/types";

interface ActivityRow extends Record<string, ReactNode> {
  action: ReactNode;
  resource_type: ReactNode;
  username: ReactNode;
  detail: ReactNode;
  ip: ReactNode;
  created_at: ReactNode;
  ops: ReactNode;
}

export default function Activities() {
  const { t } = useTranslation();
  const table = useDataTable(20);
  const [resourceType, setResourceType] = useState("");
  const [selected, setSelected] = useState<Activity | null>(null);
  const serverUrl = useConnectionStore((s) => s.serverUrl);

  const { data: stats } = useActivityStats();

  const {
    data,
    error,
    isLoading,
    refetch,
  } = useActivities({
    page: table.page,
    page_size: table.pageSize,
    resource_type: resourceType || undefined,
    action: table.debouncedSearch || undefined,
  });

  const activities = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;
  const hasFilters = Boolean(table.search.trim() || resourceType);

  const columns = [
    { key: "action" as const, header: t("activities.action"), width: "12%" },
    { key: "resource_type" as const, header: t("activities.resourceType"), width: "10%" },
    { key: "username" as const, header: t("activities.user"), width: "12%" },
    { key: "detail" as const, header: t("activities.detail"), width: "26%" },
    { key: "ip" as const, header: t("activities.ip"), width: "11%" },
    { key: "created_at" as const, header: t("activities.time"), width: "15%" },
    { key: "ops" as const, header: t("common.actions"), width: "10%" },
  ];

  const rows: ActivityRow[] = activities.map((activity) => ({
    action: <Tag tone="info">{activity.action}</Tag>,
    resource_type: <Tag tone="neutral">{activity.resource_type}</Tag>,
    username: activity.username,
    detail: activity.detail || "--",
    ip: activity.ip,
    created_at: activity.created_at.slice(0, 16).replace("T", " "),
    ops: (
      <Button size="sm" tone="outline" onClick={() => setSelected(activity)}>
        {t("activities.viewDetail")}
      </Button>
    ),
  }));

  function resetFilters() {
    setResourceType("");
    table.setSearch("");
    table.reset();
  }

  async function handleExport() {
    try {
      const token = useAuthStore.getState().token;
      const params = new URLSearchParams();
      if (resourceType) params.set("resource_type", resourceType);
      if (table.debouncedSearch) params.set("action", table.debouncedSearch);

      const requestUrl = new URL(buildApiUrl("/api/v1/activities/export", serverUrl));
      requestUrl.search = params.toString();
      const resp = await fetch(requestUrl.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        throw new Error(`export failed: ${resp.status}`);
      }
      const blob = await resp.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `activities_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  }

  const summaryChips = [
    table.search.trim()
      ? <Tag key="search" tone="info">{`${t("common.search")}: ${table.search.trim()}`}</Tag>
      : null,
    resourceType
      ? <Tag key="type" tone="neutral">{t(`activities.${resourceType}Type`)}</Tag>
      : null,
  ].filter(Boolean);

  const errorMessage = error instanceof Error ? error.message : t("common.loadFailed");

  return (
    <PageShell
      title={t("activities.title")}
      description={t("activities.description")}
      actions={
        <Button tone="outline" onClick={() => void handleExport()}>
          {t("activities.export")}
        </Button>
      }
    >
      <KPIGroup
        columns={3}
        items={[
          {
            label: t("activities.totalActions"),
            value: String(stats?.total ?? "--"),
            tone: "info",
          },
          {
            label: t("activities.todayActions"),
            value: String(stats?.today_count ?? "--"),
            tone: "success",
          },
          {
            label: t("activities.topUser"),
            value: stats?.by_user?.[0]?.username ?? "--",
            meta: stats?.by_user?.[0]
              ? `${stats.by_user[0].count} ${t("activities.actions")}`
              : undefined,
          },
        ]}
      />

      <FilterBar
        actions={
          hasFilters ? (
            <Button size="sm" tone="outline" onClick={resetFilters}>
              {t("common.reset")}
            </Button>
          ) : undefined
        }
        controls={(
          <>
            <Input
              placeholder={t("activities.search")}
              value={table.search}
              onChange={(e) => table.setSearch(e.target.value)}
            />
            <Select
              value={resourceType}
              onChange={(e) => { setResourceType(e.target.value); table.reset(); }}
            >
              <option value="">{t("activities.allTypes")}</option>
              <option value="user">{t("activities.userType")}</option>
              <option value="role">{t("activities.roleType")}</option>
              <option value="project">{t("activities.projectType")}</option>
            </Select>
          </>
        )}
      />

      {!isLoading && !error ? (
        <FilterSummary
          chips={summaryChips.length > 0 ? <span className="stc-tag-list">{summaryChips}</span> : undefined}
          summary={hasFilters ? t("common.filteredCount", { count: total }) : t("common.totalCount", { count: total })}
        />
      ) : null}

      <section className="yza-doc-card">
        <div className="yza-doc-stack">
          {isLoading ? (
            <>
              <Skeleton variant="rect" height={44} />
              <Skeleton count={6} variant="rect" height={52} />
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
              action={hasFilters ? <Button tone="outline" onClick={resetFilters}>{t("common.reset")}</Button> : undefined}
              description={hasFilters ? t("common.emptyFiltered") : t("activities.emptyDescription")}
              headers={columns.map((column) => column.header)}
              heading={t("common.noData")}
            />
          ) : (
            <>
              <DataTable<ActivityRow> columns={columns} rows={rows} />
              {totalPages > 1 && (
                <Pagination
                  page={table.page}
                  totalPages={totalPages}
                  onPageChange={table.setPage}
                />
              )}
            </>
          )}
        </div>
      </section>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={t("activities.detailTitle")}
        description={selected ? `${selected.action} / ${selected.resource_type}` : undefined}
      >
        {selected && (
          <div className="yza-doc-stack" style={{ gap: "1rem" }}>
            <DetailRow label={t("activities.action")} value={<Tag tone="info">{selected.action}</Tag>} />
            <DetailRow label={t("activities.resourceType")} value={<Tag tone="neutral">{selected.resource_type}</Tag>} />
            <DetailRow label={t("activities.resourceId")} value={String(selected.resource_id)} />
            <DetailRow label={t("activities.method")} value={selected.method || "--"} />
            <DetailRow label={t("activities.path")} value={selected.path || "--"} />
            <DetailRow label={t("activities.statusCode")} value={selected.status_code ? String(selected.status_code) : "--"} />
            <DetailRow label={t("activities.user")} value={`${selected.username} (ID: ${selected.user_id})`} />
            <DetailRow label={t("activities.ip")} value={selected.ip} />
            <DetailRow label={t("activities.userAgent")} value={selected.user_agent || "--"} />
            <DetailRow label={t("activities.detailText")} value={selected.detail || "--"} />
            <DetailRow label={t("activities.time")} value={selected.created_at.replace("T", " ")} />
            {selected.details ? (
              <div>
                <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{t("activities.detailData")}</div>
                <pre style={{
                  background: "var(--yza-color-surface-sunken, #f4f4f5)",
                  borderRadius: "0.375rem",
                  fontSize: "0.8125rem",
                  maxHeight: "16rem",
                  overflow: "auto",
                  padding: "0.75rem",
                }}>
                  {JSON.stringify(selected.details, null, 2)}
                </pre>
              </div>
            ) : (
              <DetailRow label={t("activities.detailData")} value={t("activities.noDetailData")} />
            )}
          </div>
        )}
      </Modal>
    </PageShell>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "baseline" }}>
      <span style={{ color: "var(--yza-color-text-secondary, #71717a)", flexShrink: 0, minWidth: "6rem" }}>
        {label}
      </span>
      <span style={{ wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}
