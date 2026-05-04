import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CronJob {
  id: number;
  name: string;
  cron_expr: string;
  handler: string;
  enabled: boolean;
  last_run_at: string;
  last_status: string;
  next_run_at: string;
  created_at: string;
}

export function useCronJobs() {
  return useQuery({
    queryKey: ["cron-jobs"],
    queryFn: () =>
      api.get<CronJob[]>("/api/v1/cron-jobs").then((r) => r.data),
  });
}

export function useCreateCronJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      cron_expr: string;
      handler: string;
      enabled: boolean;
    }) => api.post("/api/v1/cron-jobs", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cron-jobs"] });
    },
  });
}

export function useUpdateCronJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: number;
      name?: string;
      cron_expr?: string;
      handler?: string;
      enabled?: boolean;
    }) => api.put(`/api/v1/cron-jobs/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cron-jobs"] });
    },
  });
}

export function useDeleteCronJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/cron-jobs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cron-jobs"] });
    },
  });
}

export function useToggleCronJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.put(`/api/v1/cron-jobs/${id}/toggle`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cron-jobs"] });
    },
  });
}

export function useRunCronJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.post(`/api/v1/cron-jobs/${id}/run`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cron-jobs"] });
    },
  });
}
