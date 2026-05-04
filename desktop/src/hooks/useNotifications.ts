import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/types";
import type { Notification } from "@/types/realtime";

interface NotificationQuery {
  page?: number;
  unread_only?: boolean;
}

export function useNotifications(query: NotificationQuery) {
  return useQuery({
    queryKey: ["notifications", query],
    queryFn: () =>
      api
        .get<PaginatedResponse<Notification>>("/api/v1/notifications", { params: query })
        .then((r) => r.data),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["unread-count"],
    queryFn: () =>
      api
        .get<{ count: number }>("/api/v1/notifications/unread-count")
        .then((r) => r.data),
    refetchInterval: 60_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.put(`/api/v1/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.put("/api/v1/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });
}
