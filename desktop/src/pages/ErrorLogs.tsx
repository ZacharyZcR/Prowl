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
type TagTone = "neutral" | "info" | "success" | "warning" | "danger";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import {
  useErrorLogs,
  useErrorLogStats,
  useResolveError,
  useUnresolveError,
  useBulkResolveErrors,
} from "@/hooks/useErrorLogs";
import { useDataTable } from "@/hooks/useDataTable";
import { PageShell } from "@/components/PageShell";
import type { ErrorLog } from "@/types";

interface ErrorLogRow extends Record<string, ReactNode> {
  severity: ReactNode;
  err_type: ReactNode;
  message: ReactNode;
  source: ReactNode;
  count: ReactNode;
  last_seen: ReactNode;
  status: ReactNode;
  actions: ReactNode;
}

const SEVERITY_TONE: Record<string, TagTone> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "neutral",
};

const SOURCE_TONE: Record<string, TagTone> = {
  backend: "neutral",
  frontend: "info",
};

export default function ErrorLogs() {
  const { t } = useTranslation();
  const { can } = usePermission();
  const canResolve = can("error_log:update");

  const table = useDataTable(20);
  const [source, setSource] = useState("");
  const [severity, setSeverity] = useState("");
  const [resolved, setResolved] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [detailTarget, setDetailTarget] = useState<ErrorLog | null>(null);

  const resolvedParam = resolved === "" ? undefined : resolved === "resolved";

  const { data, error, isLoading, refetch } = useErrorLogs({
    page: table.page,
    page_size: table.pageSize,
    source: source || undefined,
    severity: severity || undefined,
    resolved: resolvedParam,
    search: table.debouncedSearch || undefined,
  });

  const statsQuery = useErrorLogStats();
  const stats = statsQuery.data;

  const resolveMutation = useResolveError();
  const unresolveMutation = useUnresolveError();
  const bulkResolveMutation = useBulkResolveErrors();

  const items = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;
  const hasFilters = Boolean(table.search.trim() || source || severity || resolved);

  function resetFilters() {
    setSource("");
    setSeverity("");
    setResolved("");
    table.setSearch("");
    table.reset();
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleResolve(id: number) {
    try {
      await resolveMutation.mutateAsync(id);
      toast.success(t("errorLogs.resolve"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleUnresolve(id: number) {
    try {
      await unresolveMutation.mutateAsync(id);
      toast.success(t("errorLogs.unresolve"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleBulkResolve() {
    try {
      await bulkResolveMutation.mutateAsync(Array.from(selected));
      toast.success(t("errorLogs.bulkResolve"));
      setSelected(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  const columns = [
    { key: "severity" as const, header: t("errorLogs.severity"), width: "9%" },
    { key: "err_type" as const, header: t("errorLogs.type"), width: "12%" },
    { key: "message" as const, header: t("errorLogs.message"), width: "26%" },
    { key: "source" as const, header: t("errorLogs.source"), width: "8%" },
    { key: "count" as const, header: t("errorLogs.count"), width: "7%", align: "right" as const },
    { key: "last_seen" as const, header: t("errorLogs.lastSeen"), width: "14%" },
    { key: "status" as const, header: t("errorLogs.status"), width: "9%" },
    { key: "actions" as const, header: t("common.actions"), width: "15%", align: "right" as const },
  ];

  const rows: ErrorLogRow[] = items.map((item) => ({
    severity: <Tag tone={SEVERITY_TONE[item.severity] ?? "neutral"}>{item.severity}</Tag>,
    err_type: item.err_type,
    message: (
      <button
        type="button"
        className="stc-link-button"
        onClick={() => setDetailTarget(item)}
        title={item.message}
        style={{ textAlign: "left", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--yza-text-default)", font: "inherit" }}
      >
        {item.message.length > 60 ? item.message.slice(0, 60) + "..." : item.message}
      </button>
    ),
    source: <Tag tone={SOURCE_TONE[item.source] ?? "neutral"}>{t(`errorLogs.${item.source}`)}</Tag>,
    count: String(item.occurrence_count),
    last_seen: item.last_seen_at.slice(0, 16).replace("T", " "),
    status: item.resolved
      ? <Tag tone="success">{t("errorLogs.resolved")}</Tag>
      : <Tag tone="danger">{t("errorLogs.unresolvedStatus")}</Tag>,
    actions: (
      <div className="yza-button-row">
        {canResolve && (
          <>
            <input
              type="checkbox"
              checked={selected.has(item.id)}
              onChange={() => toggleSelect(item.id)}
              aria-label={`Select ${item.id}`}
            />
            {item.resolved ? (
              <Button size="sm" tone="outline" onClick={() => { void handleUnresolve(item.id); }}>
                {t("errorLogs.unresolve")}
              </Button>
            ) : (
              <Button size="sm" tone="primary" onClick={() => { void handleResolve(item.id); }}>
                {t("errorLogs.resolve")}
              </Button>
            )}
          </>
        )}
      </div>
    ),
  }));

  const summaryChips = [
    table.search.trim()
      ? <Tag key="search" tone="info">{`${t("common.search")}: ${table.search.trim()}`}</Tag>
      : null,
    source ? <Tag key="source" tone="neutral">{t(`errorLogs.${source}`)}</Tag> : null,
    severity ? <Tag key="severity" tone={SEVERITY_TONE[severity] ?? "neutral"}>{severity}</Tag> : null,
    resolved ? <Tag key="resolved" tone="info">{resolved === "resolved" ? t("errorLogs.resolved") : t("errorLogs.unresolvedStatus")}</Tag> : null,
  ].filter(Boolean);

  const errorMessage = error instanceof Error ? error.message : t("common.loadFailed");

  return (
    <PageShell
      title={t("errorLogs.title")}
      description={t("errorLogs.description")}
    >
      <KPIGroup
        items={[
          {
            label: t("errorLogs.total"),
            value: statsQuery.isLoading ? "..." : String(stats?.total ?? 0),
            tone: "info",
          },
          {
            label: t("errorLogs.unresolved"),
            value: statsQuery.isLoading ? "..." : String(stats?.unresolved ?? 0),
            tone: "danger",
          },
          {
            label: t("errorLogs.critical"),
            value: statsQuery.isLoading ? "..." : String(stats?.by_severity?.critical ?? 0),
            tone: "danger",
          },
          {
            label: t("errorLogs.high"),
            value: statsQuery.isLoading ? "..." : String(stats?.by_severity?.high ?? 0),
            tone: "warning",
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
              placeholder={t("errorLogs.search")}
              value={table.search}
              onChange={(e) => table.setSearch(e.target.value)}
            />
            <Select
              value={source}
              onChange={(e) => { setSource(e.target.value); table.reset(); }}
            >
              <option value="">{t("errorLogs.allSource")}</option>
              <option value="frontend">{t("errorLogs.frontend")}</option>
              <option value="backend">{t("errorLogs.backend")}</option>
            </Select>
            <Select
              value={severity}
              onChange={(e) => { setSeverity(e.target.value); table.reset(); }}
            >
              <option value="">{t("errorLogs.allSeverity")}</option>
              <option value="critical">{t("errorLogs.critical")}</option>
              <option value="high">{t("errorLogs.high")}</option>
              <option value="medium">{t("errorLogs.medium")}</option>
              <option value="low">{t("errorLogs.low")}</option>
            </Select>
            <Select
              value={resolved}
              onChange={(e) => { setResolved(e.target.value); table.reset(); }}
            >
              <option value="">{t("errorLogs.allStatus")}</option>
              <option value="unresolved">{t("errorLogs.unresolvedStatus")}</option>
              <option value="resolved">{t("errorLogs.resolved")}</option>
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

      {selected.size > 0 && canResolve && (
        <div className="yza-button-row" style={{ padding: "8px 0" }}>
          <Tag tone="info">{t("errorLogs.bulkResolve")}: {selected.size}</Tag>
          <Button size="sm" tone="primary" onClick={() => { void handleBulkResolve(); }} disabled={bulkResolveMutation.isPending}>
            {t("errorLogs.bulkResolve")}
          </Button>
        </div>
      )}

      <section className="yza-doc-card">
        <div className="yza-doc-stack">
          {isLoading ? (
            <>
              <Skeleton variant="rect" height={44} />
              <Skeleton count={8} variant="rect" height={52} />
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
              headers={columns.map((c) => c.header)}
              heading={t("common.noData")}
            />
          ) : (
            <>
              <DataTable<ErrorLogRow> columns={columns} rows={rows} />
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
        open={detailTarget !== null}
        title={t("errorLogs.detail")}
        onClose={() => setDetailTarget(null)}
        footer={
          <Button tone="outline" onClick={() => setDetailTarget(null)}>
            {t("common.cancel")}
          </Button>
        }
      >
        {detailTarget && (
          <div className="yza-doc-stack">
            <div>
              <strong>{t("errorLogs.severity")}:</strong>{" "}
              <Tag tone={SEVERITY_TONE[detailTarget.severity] ?? "neutral"}>{detailTarget.severity}</Tag>
              {" "}
              <strong>{t("errorLogs.source")}:</strong>{" "}
              <Tag tone={SOURCE_TONE[detailTarget.source] ?? "neutral"}>{t(`errorLogs.${detailTarget.source}`)}</Tag>
              {" "}
              <strong>{t("errorLogs.status")}:</strong>{" "}
              {detailTarget.resolved
                ? <Tag tone="success">{t("errorLogs.resolved")}</Tag>
                : <Tag tone="danger">{t("errorLogs.unresolvedStatus")}</Tag>
              }
            </div>

            <div>
              <strong>{t("errorLogs.type")}:</strong> {detailTarget.err_type}
            </div>

            <div>
              <strong>{t("errorLogs.message")}:</strong>
              <p style={{ margin: "4px 0", wordBreak: "break-all" }}>{detailTarget.message}</p>
            </div>

            <div>
              <strong>{t("errorLogs.stack")}:</strong>
              <pre style={{ margin: "4px 0", padding: "8px", background: "var(--yza-surface-raised, #f5f5f5)", borderRadius: "4px", overflowX: "auto", fontFamily: "monospace", fontSize: "12px", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {detailTarget.stack || t("errorLogs.noStack")}
              </pre>
            </div>

            <div>
              <strong>{t("errorLogs.requestInfo")}:</strong>
              <div style={{ marginTop: "4px" }}>
                <div>URL: {detailTarget.url || "--"}</div>
                <div>Method: {detailTarget.method || "--"}</div>
                <div>Status: {detailTarget.status_code || "--"}</div>
                <div>Request ID: {detailTarget.request_id || "--"}</div>
                <div>User Agent: {detailTarget.user_agent || "--"}</div>
              </div>
            </div>

            <div>
              <strong>Params:</strong>
              <pre style={{ margin: "4px 0", padding: "8px", background: "var(--yza-surface-raised, #f5f5f5)", borderRadius: "4px", overflowX: "auto", fontFamily: "monospace", fontSize: "12px" }}>
                {detailTarget.params ? JSON.stringify(detailTarget.params, null, 2) : t("errorLogs.noParams")}
              </pre>
            </div>

            <div>
              <strong>{t("errorLogs.occurrences")}:</strong> {detailTarget.occurrence_count}
              {" | "}
              <strong>{t("errorLogs.firstSeen")}:</strong> {detailTarget.first_seen_at?.slice(0, 16).replace("T", " ") ?? "--"}
              {" | "}
              <strong>{t("errorLogs.lastSeen")}:</strong> {detailTarget.last_seen_at?.slice(0, 16).replace("T", " ") ?? "--"}
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
