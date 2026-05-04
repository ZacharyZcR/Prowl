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
  Pagination,
  Select,
  Skeleton,
  Tag,
} from "@yza/ui";
import { useLoginLogs, useLoginLogStats } from "@/hooks/useLoginLogs";
import { useDataTable } from "@/hooks/useDataTable";
import { PageShell } from "@/components/PageShell";

interface LoginLogRow extends Record<string, ReactNode> {
  username: ReactNode;
  ip: ReactNode;
  success: ReactNode;
  failure_reason: ReactNode;
  user_agent: ReactNode;
  created_at: ReactNode;
}

export default function LoginLogs() {
  const { t } = useTranslation();
  const table = useDataTable(20);
  const [successFilter, setSuccessFilter] = useState("");

  const { data: stats } = useLoginLogStats();

  const {
    data,
    error,
    isLoading,
    refetch,
  } = useLoginLogs({
    page: table.page,
    page_size: table.pageSize,
    username: table.debouncedSearch || undefined,
    success: successFilter || undefined,
  });

  const logs = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;
  const hasFilters = Boolean(table.search.trim() || successFilter);

  const columns = [
    { key: "username" as const, header: t("loginLogs.username"), width: "14%" },
    { key: "ip" as const, header: t("loginLogs.ip"), width: "14%" },
    { key: "success" as const, header: t("common.results"), width: "10%" },
    { key: "failure_reason" as const, header: t("loginLogs.failureReason"), width: "14%" },
    { key: "user_agent" as const, header: t("loginLogs.userAgent"), width: "30%" },
    { key: "created_at" as const, header: t("loginLogs.time"), width: "18%" },
  ];

  const failureReasonMap: Record<string, string> = {
    invalid_credentials: t("loginLogs.invalidCredentials"),
    user_not_found: t("loginLogs.userNotFound"),
    account_locked: t("loginLogs.accountLocked"),
  };

  const rows: LoginLogRow[] = logs.map((log) => ({
    username: log.username,
    ip: log.ip,
    success: log.success
      ? <Tag tone="success">{t("loginLogs.success")}</Tag>
      : <Tag tone="danger">{t("loginLogs.failed")}</Tag>,
    failure_reason: log.failure_reason
      ? (failureReasonMap[log.failure_reason] ?? log.failure_reason)
      : "--",
    user_agent: (
      <span title={log.user_agent} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "20rem" }}>
        {log.user_agent || "--"}
      </span>
    ),
    created_at: log.created_at.slice(0, 16).replace("T", " "),
  }));

  function resetFilters() {
    setSuccessFilter("");
    table.setSearch("");
    table.reset();
  }

  const summaryChips = [
    table.search.trim()
      ? <Tag key="search" tone="info">{`${t("common.search")}: ${table.search.trim()}`}</Tag>
      : null,
    successFilter
      ? <Tag key="status" tone="neutral">{successFilter === "true" ? t("loginLogs.success") : t("loginLogs.failed")}</Tag>
      : null,
  ].filter(Boolean);

  const errorMessage = error instanceof Error ? error.message : t("common.loadFailed");

  return (
    <PageShell
      title={t("loginLogs.title")}
      description={t("loginLogs.description")}
    >
      <KPIGroup
        columns={3}
        items={[
          {
            label: t("loginLogs.todayLogins"),
            value: String(stats?.today_count ?? "--"),
            tone: "info",
          },
          {
            label: t("loginLogs.successRate"),
            value: stats ? `${stats.success_rate.toFixed(1)}%` : "--",
            tone: "success",
          },
          {
            label: t("loginLogs.failureCount"),
            value: String(stats?.failure_count ?? "--"),
            tone: "danger",
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
              placeholder={t("loginLogs.search")}
              value={table.search}
              onChange={(e) => table.setSearch(e.target.value)}
            />
            <Select
              value={successFilter}
              onChange={(e) => { setSuccessFilter(e.target.value); table.reset(); }}
            >
              <option value="">{t("loginLogs.allStatus")}</option>
              <option value="true">{t("loginLogs.success")}</option>
              <option value="false">{t("loginLogs.failed")}</option>
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
              description={hasFilters ? t("common.emptyFiltered") : t("common.noData")}
              headers={columns.map((column) => column.header)}
              heading={t("common.noData")}
            />
          ) : (
            <>
              <DataTable<LoginLogRow> columns={columns} rows={rows} />
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
    </PageShell>
  );
}
