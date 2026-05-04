import { useTranslation } from "react-i18next";
import { KPIGroup, Tag, SettingsSection, Skeleton } from "@yza/ui";
import { PageShell } from "@/components/PageShell";
import { useSystemHealth, useMetricsSummary } from "@/hooks/useHealthMonitor";

export default function HealthMonitor() {
  const { t } = useTranslation();
  const healthQuery = useSystemHealth();
  const metricsQuery = useMetricsSummary();

  const health = healthQuery.data;
  const metrics = metricsQuery.data;

  if (healthQuery.isLoading || metricsQuery.isLoading) {
    return (
      <PageShell title={t("healthMonitor.title")} description={t("healthMonitor.description")}>
        <Skeleton count={4} height={40} />
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
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
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
        <dl style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "8px 16px", margin: 0 }}>
          <dt style={{ opacity: 0.6 }}>{t("healthMonitor.version")}</dt>
          <dd style={{ margin: 0 }}>{health?.server.version ?? "--"}</dd>
          <dt style={{ opacity: 0.6 }}>{t("healthMonitor.uptime")}</dt>
          <dd style={{ margin: 0 }}>{health?.server.uptime ?? "--"}</dd>
          <dt style={{ opacity: 0.6 }}>{t("healthMonitor.goVersion")}</dt>
          <dd style={{ margin: 0 }}>{health?.server.go_version ?? "--"}</dd>
          <dt style={{ opacity: 0.6 }}>{t("healthMonitor.os")}</dt>
          <dd style={{ margin: 0 }}>{health?.server.os ?? "--"}</dd>
          <dt style={{ opacity: 0.6 }}>{t("healthMonitor.arch")}</dt>
          <dd style={{ margin: 0 }}>{health?.server.arch ?? "--"}</dd>
        </dl>
      </SettingsSection>

      <SettingsSection title={t("healthMonitor.runtime")} description="">
        <dl style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "8px 16px", margin: 0 }}>
          <dt style={{ opacity: 0.6 }}>{t("healthMonitor.goroutines")}</dt>
          <dd style={{ margin: 0 }}>{health?.runtime.goroutines ?? "--"}</dd>
          <dt style={{ opacity: 0.6 }}>{t("healthMonitor.memAlloc")}</dt>
          <dd style={{ margin: 0 }}>{health?.runtime.mem_alloc ?? "--"}</dd>
          <dt style={{ opacity: 0.6 }}>{t("healthMonitor.memSys")}</dt>
          <dd style={{ margin: 0 }}>{health?.runtime.mem_sys ?? "--"}</dd>
          <dt style={{ opacity: 0.6 }}>{t("healthMonitor.gcPause")}</dt>
          <dd style={{ margin: 0 }}>{health?.runtime.gc_pause_avg ?? "--"}</dd>
          <dt style={{ opacity: 0.6 }}>{t("healthMonitor.numGC")}</dt>
          <dd style={{ margin: 0 }}>{health?.runtime.num_gc ?? "--"}</dd>
          <dt style={{ opacity: 0.6 }}>{t("healthMonitor.cpus")}</dt>
          <dd style={{ margin: 0 }}>{health?.runtime.cpus ?? "--"}</dd>
          <dt style={{ opacity: 0.6 }}>{t("healthMonitor.uploadDir")}</dt>
          <dd style={{ margin: 0 }}>{health?.disk.upload_dir ?? "--"}</dd>
          <dt style={{ opacity: 0.6 }}>{t("healthMonitor.uploadSize")}</dt>
          <dd style={{ margin: 0 }}>{health?.disk.upload_size ?? "--"}</dd>
        </dl>
      </SettingsSection>

      {metrics && metrics.top_paths.length > 0 && (
        <SettingsSection title={t("healthMonitor.topPaths")} description="">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid var(--yza-color-neutral-200)", opacity: 0.6 }}>
                  {t("healthMonitor.path")}
                </th>
                <th style={{ textAlign: "right", padding: "8px 12px", borderBottom: "1px solid var(--yza-color-neutral-200)", opacity: 0.6 }}>
                  {t("healthMonitor.count")}
                </th>
              </tr>
            </thead>
            <tbody>
              {metrics.top_paths.map((p) => (
                <tr key={p.path}>
                  <td style={{ padding: "6px 12px", borderBottom: "1px solid var(--yza-color-neutral-100)", fontFamily: "monospace", fontSize: 13 }}>
                    {p.path}
                  </td>
                  <td style={{ padding: "6px 12px", borderBottom: "1px solid var(--yza-color-neutral-100)", textAlign: "right" }}>
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
  const isHealthy = status === "healthy";
  return (
    <div
      style={{
        flex: "1 1 240px",
        padding: 16,
        borderRadius: 8,
        border: "1px solid var(--yza-color-neutral-200)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <strong>{name}</strong>
        <Tag tone={isHealthy ? "success" : "danger"}>
          {isHealthy ? t("healthMonitor.healthy") : t("healthMonitor.unhealthy")}
        </Tag>
      </div>
      <div style={{ fontSize: 13, opacity: 0.7 }}>
        {t("healthMonitor.latency")}: {latency ?? "--"}
      </div>
      {message && (
        <div style={{ fontSize: 12, color: "var(--yza-color-danger-500)", marginTop: 4 }}>{message}</div>
      )}
    </div>
  );
}
