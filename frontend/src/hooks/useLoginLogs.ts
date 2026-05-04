import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/types";

export interface LoginLog {
  id: number;
  user_id: number;
  username: string;
  ip: string;
  user_agent: string;
  success: boolean;
  failure_reason: string;
  location: string;
  created_at: string;
}

export interface LoginLogStats {
  total: number;
  today_count: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
}

interface LoginLogQuery {
  page?: number;
  page_size?: number;
  username?: string;
  ip?: string;
  success?: string;
}

export function useLoginLogs(query: LoginLogQuery, enabled = true) {
  return useQuery({
    queryKey: ["login-logs", query],
    queryFn: () =>
      api
        .get<PaginatedResponse<LoginLog>>("/api/v1/login-logs", { params: query })
        .then((r) => r.data),
    enabled,
  });
}

export function useLoginLogStats() {
  return useQuery({
    queryKey: ["login-log-stats"],
    queryFn: () =>
      api
        .get<LoginLogStats>("/api/v1/login-logs/statistics")
        .then((r) => r.data),
  });
}
