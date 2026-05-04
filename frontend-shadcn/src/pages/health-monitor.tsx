import { useTranslation } from "react-i18next";
import {
  Database,
  Server,
  Cpu,
  HardDrive,
  Activity,
  Gauge,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSystemHealth,
  useMetricsSummary,
} from "@/hooks/useHealthMonitor";

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "healthy" || status === "connected"
      ? "default"
      : "destructive";
  return <Badge variant={variant}>{status}</Badge>;
}

export default function HealthMonitor() {
  const { t } = useTranslation();
  const { data: health, isLoading: healthLoading } = useSystemHealth();
  const { data: metrics, isLoading: metricsLoading } = useMetricsSummary();

  if (healthLoading || metricsLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("health.title", "System Health")} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent>
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("health.title", "System Health")}
        description={t("health.description", "Real-time system monitoring")}
      />

      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("health.uptime", "Uptime")}
          value={health?.server.uptime ?? "-"}
          icon={<Server className="size-5" />}
        />
        <StatCard
          title={t("health.totalRequests", "Total Requests")}
          value={metrics?.total_requests ?? 0}
          icon={<Activity className="size-5" />}
        />
        <StatCard
          title={t("health.errorRate", "Error Rate")}
          value={`${((metrics?.error_rate ?? 0) * 100).toFixed(2)}%`}
          icon={<Gauge className="size-5" />}
        />
        <StatCard
          title={t("health.memAlloc", "Memory Allocated")}
          value={health?.runtime.mem_alloc ?? "-"}
          icon={<Cpu className="size-5" />}
        />
      </div>

      {/* Components */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="size-4" />
              {t("health.database", "Database")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("health.status", "Status")}
              </span>
              <StatusBadge status={health?.database.status ?? "unknown"} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("health.latency", "Latency")}
              </span>
              <span>{health?.database.latency ?? "-"}</span>
            </div>
            {health?.database.message && (
              <p className="text-xs text-muted-foreground">
                {health.database.message}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="size-4" />
              {t("health.redis", "Redis")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("health.status", "Status")}
              </span>
              <StatusBadge status={health?.redis.status ?? "unknown"} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("health.latency", "Latency")}
              </span>
              <span>{health?.redis.latency ?? "-"}</span>
            </div>
            {health?.redis.message && (
              <p className="text-xs text-muted-foreground">
                {health.redis.message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Server & Runtime */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="size-4" />
              {t("health.serverInfo", "Server Info")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["Version", health?.server.version],
              ["Go Version", health?.server.go_version],
              ["OS / Arch", `${health?.server.os ?? "-"} / ${health?.server.arch ?? "-"}`],
              ["Started At", health?.server.started_at],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-right">{value ?? "-"}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Cpu className="size-4" />
              {t("health.runtime", "Runtime")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              [t("health.goroutines", "Goroutines"), health?.runtime.goroutines],
              [t("health.memSys", "System Memory"), health?.runtime.mem_sys],
              [t("health.gcPause", "GC Pause Avg"), health?.runtime.gc_pause_avg],
              [t("health.numGC", "GC Cycles"), health?.runtime.num_gc],
              [t("health.cpus", "CPUs"), health?.runtime.cpus],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span>{value ?? "-"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Disk & Top Paths */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="size-4" />
              {t("health.disk", "Disk")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("health.uploadDir", "Upload Directory")}
              </span>
              <span className="text-right truncate max-w-[200px]">
                {health?.disk.upload_dir ?? "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("health.uploadSize", "Upload Size")}
              </span>
              <span>{health?.disk.upload_size ?? "-"}</span>
            </div>
          </CardContent>
        </Card>

        {metrics?.top_paths && metrics.top_paths.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t("health.topPaths", "Top Request Paths")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {metrics.top_paths.map((p) => (
                <div key={p.path} className="flex justify-between">
                  <span className="truncate max-w-[200px] text-muted-foreground">
                    {p.path}
                  </span>
                  <Badge variant="secondary">{p.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
