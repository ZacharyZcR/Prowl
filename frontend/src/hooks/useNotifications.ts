import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useNotificationStore } from "@/stores/notification";
import type { PaginatedResponse } from "@/types";
import type { Notification } from "@/types/realtime";

interface NotificationQuery {
  page?: number;
  unread_only?: boolean;
}

type NotificationListSnapshot = Array<[readonly unknown[], PaginatedResponse<Notification> | undefined]>;

function getNotificationSnapshots(qc: ReturnType<typeof useQueryClient>) {
  return {
    lists: qc.getQueriesData<PaginatedResponse<Notification>>({ queryKey: ["notifications"] }),
    unread: qc.getQueryData<{ count: number }>(["unread-count"]),
  };
}

function restoreNotificationSnapshots(
  qc: ReturnType<typeof useQueryClient>,
  snapshots: { lists: NotificationListSnapshot; unread: { count: number } | undefined },
) {
  snapshots.lists.forEach(([key, data]) => {
    qc.setQueryData(key, data);
  });
  qc.setQueryData(["unread-count"], snapshots.unread);
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
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      await qc.cancelQueries({ queryKey: ["unread-count"] });

      const snapshots = getNotificationSnapshots(qc);
      let didUpdate = false;

      snapshots.lists.forEach(([key, data]) => {
        if (!data) {
          return;
        }

        const items = data.items.map((item) => {
          if (item.id !== id || item.read) {
            return item;
          }
          didUpdate = true;
          return { ...item, read: true };
        });

        qc.setQueryData(key, { ...data, items });
      });

      if (didUpdate && snapshots.unread) {
        qc.setQueryData(["unread-count"], {
          ...snapshots.unread,
          count: Math.max(0, snapshots.unread.count - 1),
        });
      }

      return snapshots;
    },
    onError: (_error, _id, snapshots) => {
      if (snapshots) {
        restoreNotificationSnapshots(qc, snapshots);
      }
    },
    onSuccess: (_, id) => {
      useNotificationStore.getState().markRead(id);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.put("/api/v1/notifications/read-all"),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      await qc.cancelQueries({ queryKey: ["unread-count"] });

      const snapshots = getNotificationSnapshots(qc);

      snapshots.lists.forEach(([key, data]) => {
        if (!data) {
          return;
        }

        qc.setQueryData(key, {
          ...data,
          items: data.items.map((item) => ({ ...item, read: true })),
        });
      });

      qc.setQueryData(["unread-count"], { count: 0 });
      return snapshots;
    },
    onError: (_error, _vars, snapshots) => {
      if (snapshots) {
        restoreNotificationSnapshots(qc, snapshots);
      }
    },
    onSuccess: () => {
      useNotificationStore.getState().markAllRead();
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });
}
