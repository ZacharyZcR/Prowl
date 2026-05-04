import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PaginatedResponse, ErrorLog, ErrorLogStats } from "@/types";

interface ErrorLogQuery {
  page?: number;
  page_size?: number;
  source?: string;
  err_type?: string;
  severity?: string;
  resolved?: boolean;
  search?: string;
}

export function useErrorLogs(query: ErrorLogQuery) {
  return useQuery({
    queryKey: ["error-logs", query],
    queryFn: () =>
      api
        .get<PaginatedResponse<ErrorLog>>("/api/v1/error-logs", { params: query })
        .then((r) => r.data),
  });
}

export function useErrorLog(id: number) {
  return useQuery({
    queryKey: ["error-logs", id],
    queryFn: () =>
      api.get<ErrorLog>(`/api/v1/error-logs/${id}`).then((r) => r.data),
    enabled: id > 0,
  });
}

export function useErrorLogStats() {
  return useQuery({
    queryKey: ["error-log-stats"],
    queryFn: () =>
      api.get<ErrorLogStats>("/api/v1/error-logs/statistics").then((r) => r.data),
  });
}

export function useResolveError() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.put(`/api/v1/error-logs/${id}/resolve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["error-logs"] });
      qc.invalidateQueries({ queryKey: ["error-log-stats"] });
    },
  });
}

export function useUnresolveError() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.put(`/api/v1/error-logs/${id}/unresolve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["error-logs"] });
      qc.invalidateQueries({ queryKey: ["error-log-stats"] });
    },
  });
}

export function useBulkResolveErrors() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => api.post("/api/v1/error-logs/bulk-resolve", { ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["error-logs"] });
      qc.invalidateQueries({ queryKey: ["error-log-stats"] });
    },
  });
}
