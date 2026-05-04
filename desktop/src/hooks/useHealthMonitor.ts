import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ComponentHealth {
  status: string;
  latency: string;
  message?: string;
}

export interface SystemHealth {
  server: {
    version: string;
    uptime: string;
    started_at: string;
    go_version: string;
    os: string;
    arch: string;
  };
  database: ComponentHealth;
  redis: ComponentHealth;
  runtime: {
    goroutines: number;
    mem_alloc: string;
    mem_sys: string;
    gc_pause_avg: string;
    num_gc: number;
    cpus: number;
  };
  disk: {
    upload_dir: string;
    upload_size: string;
  };
}

export interface PathCount {
  path: string;
  count: number;
}

export interface MetricsSummary {
  total_requests: number;
  total_errors: number;
  error_rate: number;
  top_paths: PathCount[];
  uptime: string;
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ["health", "monitor"],
    queryFn: () =>
      api.get<SystemHealth>("/api/v1/health/monitor").then((r) => r.data),
    refetchInterval: 5000,
  });
}

export function useMetricsSummary() {
  return useQuery({
    queryKey: ["health", "metrics"],
    queryFn: () =>
      api.get<MetricsSummary>("/api/v1/health/metrics").then((r) => r.data),
    refetchInterval: 10000,
  });
}
