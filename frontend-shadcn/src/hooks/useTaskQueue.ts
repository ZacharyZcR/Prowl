import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface QueueStats {
  workers: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
}

export interface QueueTask {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  error?: string;
  created_at: string;
  started_at?: string;
  done_at?: string;
}

export function useQueueStats() {
  return useQuery({
    queryKey: ["queue", "stats"],
    queryFn: () =>
      api.get<QueueStats>("/api/v1/queue/stats").then((r) => r.data),
    refetchInterval: 5000,
  });
}

export function useQueueTasks() {
  return useQuery({
    queryKey: ["queue", "tasks"],
    queryFn: () =>
      api.get<QueueTask[]>("/api/v1/queue/tasks").then((r) => r.data),
    refetchInterval: 5000,
  });
}

export function useEnqueueTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/v1/queue/tasks"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}
