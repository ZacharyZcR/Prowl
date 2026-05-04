import { useTranslation } from "react-i18next";
import { Alert, Button, KPIGroup, Tag, SettingsSection, Skeleton } from "@yza/ui";
import { PageShell } from "@/components/PageShell";
import { useSystemHealth, useMetricsSummary } from "@/hooks/useHealthMonitor";

export default function HealthMonitor() {
  const { t } = useTranslation();
  const healthQuery = useSystemHealth();
  const metricsQuery = useMetricsSummary();

  const health = healthQuery.data;
  const metrics = metricsQuery.data;
  const hasError = healthQuery.error || metricsQuery.error;
  const serverItems = [
    { label: t("healthMonitor.version"), value: health?.server.version ?? "--" },
    { label: t("healthMonitor.uptime"), value: health?.server.uptime ?? "--" },
    { label: t("healthMonitor.goVersion"), value: health?.server.go_version ?? "--" },
    { label: t("healthMonitor.os"), value: health?.server.os ?? "--" },
    { label: t("healthMonitor.arch"), value: health?.server.arch ?? "--" },
  ];
  const runtimeItems = [
    { label: t("healthMonitor.goroutines"), value: health?.runtime.goroutines ?? "--" },
    { label: t("healthMonitor.memAlloc"), value: health?.runtime.mem_alloc ?? "--" },
    { label: t("healthMonitor.memSys"), value: health?.runtime.mem_sys ?? "--" },
    { label: t("healthMonitor.gcPause"), value: health?.runtime.gc_pause_avg ?? "--" },
    { label: t("healthMonitor.numGC"), value: health?.runtime.num_gc ?? "--" },
    { label: t("healthMonitor.cpus"), value: health?.runtime.cpus ?? "--" },
    { label: t("healthMonitor.uploadDir"), value: health?.disk.upload_dir ?? "--" },
    { label: t("healthMonitor.uploadSize"), value: health?.disk.upload_size ?? "--" },
  ];

  if (healthQuery.isLoading || metricsQuery.isLoading) {
    return (
      <PageShell title={t("healthMonitor.title")} description={t("healthMonitor.description")}>
        <Skeleton count={4} height={40} />
      </PageShell>
    );
  }

  if (hasError) {
    const message =
      healthQuery.error instanceof Error
        ? healthQuery.error.message
        : metricsQuery.error instanceof Error
          ? metricsQuery.error.message
          : t("common.loadFailed");

    return (
      <PageShell title={t("healthMonitor.title")} description={t("healthMonitor.description")}>
        <div className="yza-doc-stack">
          <Alert
            heading={t("common.loadFailed")}
            description={message}
            tone="danger"
          />
          <div>
            <Button
              tone="outline"
              onClick={() => {
                void healthQuery.refetch();
                void metricsQuery.refetch();
              }}
            >
              {t("common.retry")}
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={t("healthMonitor.title")} description={t("healthMonitor.description")}>
      <KPIGroup
        items={[
          {
            label: t("healthMonitor.totalRequests"),
            value: metrics ? String(metrics.total_requests) : "--",
            tone: "info",
          },
          {
            label: t("healthMonitor.errorRate"),
            value: metrics ? `${metrics.error_rate.toFixed(2)}%` : "--",
            tone: metrics && metrics.error_rate > 5 ? "danger" : "success",
          },
          {
            label: t("healthMonitor.goroutines"),
            value: health ? String(health.runtime.goroutines) : "--",
            tone: "info",
          },
          {
            label: t("healthMonitor.memUsage"),
            value: health?.runtime.mem_alloc ?? "--",
            tone: "info",
          },
        ]}
      />

      <SettingsSection title={t("healthMonitor.components")} description="">
        <div className="stc-health-grid">
          <ComponentCard
            name={t("healthMonitor.database")}
            status={health?.database.status}
            latency={health?.database.latency}
            message={health?.database.message}
            t={t}
          />
          <ComponentCard
            name={t("healthMonitor.redis")}
            status={health?.redis.status}
            latency={health?.redis.latency}
            message={health?.redis.message}
            t={t}
          />
        </div>
      </SettingsSection>

      <SettingsSection title={t("healthMonitor.serverInfo")} description="">
        <KeyValueGrid items={serverItems} />
      </SettingsSection>

      <SettingsSection title={t("healthMonitor.runtime")} description="">
        <KeyValueGrid items={runtimeItems} />
      </SettingsSection>

      {metrics && metrics.top_paths.length > 0 && (
        <SettingsSection title={t("healthMonitor.topPaths")} description="">
          <table className="stc-health-table">
            <thead>
              <tr>
                <th className="stc-health-table__head">
                  {t("healthMonitor.path")}
                </th>
                <th className="stc-health-table__head stc-health-table__head--right">
                  {t("healthMonitor.count")}
                </th>
              </tr>
            </thead>
            <tbody>
              {metrics.top_paths.map((p) => (
                <tr key={p.path}>
                  <td
                    className="stc-health-table__cell stc-health-table__cell--path"
                    data-label={t("healthMonitor.path")}
                  >
                    {p.path}
                  </td>
                  <td
                    className="stc-health-table__cell stc-health-table__cell--right"
                    data-label={t("healthMonitor.count")}
                  >
                    {p.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SettingsSection>
      )}
    </PageShell>
  );
}

function KeyValueGrid({ items }: { items: Array<{ label: string; value: string | number }> }) {
  return (
    <dl className="stc-health-kv">
      {items.map((item) => (
        <div key={item.label} className="stc-health-kv__row">
          <dt className="stc-health-kv__label">{item.label}</dt>
          <dd className="stc-health-kv__value">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ComponentCard({
  name,
  status,
  latency,
  message,
  t,
}: {
  name: string;
  status?: string;
  latency?: string;
  message?: string;
  t: (key: string) => string;
}) {
  const tone =
    status === "healthy"
      ? "success"
      : status
        ? "danger"
        : "neutral";
  const label =
    status === "healthy"
      ? t("healthMonitor.healthy")
      : status
        ? t("healthMonitor.unhealthy")
        : t("healthMonitor.unknown");
  return (
    <div className="stc-health-card">
      <div className="stc-health-card__header">
        <strong>{name}</strong>
        <Tag tone={tone}>{label}</Tag>
      </div>
      <div className="stc-health-card__meta">
        {t("healthMonitor.latency")}: {latency ?? "--"}
      </div>
      {message && (
        <div className="stc-health-card__message">{message}</div>
      )}
    </div>
  );
}
