import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Webhook, WebhookTestResult } from "@/types";

export function useWebhooks() {
  return useQuery({
    queryKey: ["webhooks"],
    queryFn: () =>
      api.get<Webhook[]>("/api/v1/webhooks").then((r) => r.data),
  });
}

export function useWebhook(id: number) {
  return useQuery({
    queryKey: ["webhooks", id],
    queryFn: () =>
      api.get<Webhook>(`/api/v1/webhooks/${id}`).then((r) => r.data),
    enabled: id > 0,
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      url: string;
      secret?: string;
      events: string[];
      headers?: Record<string, string>;
    }) => api.post("/api/v1/webhooks", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
}

export function useUpdateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: number;
      name?: string;
      url?: string;
      secret?: string;
      events?: string[];
      headers?: Record<string, string>;
    }) => api.put(`/api/v1/webhooks/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/webhooks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
}

export function useToggleWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.put(`/api/v1/webhooks/${id}/toggle`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: (id: number) =>
      api.post<WebhookTestResult>(`/api/v1/webhooks/${id}/test`).then((r) => r.data),
  });
}
