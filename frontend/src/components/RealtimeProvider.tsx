import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { WebSocketManager } from "@/lib/websocket";
import { SSEManager } from "@/lib/sse";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notification";
import { useOnlineStore } from "@/stores/online";
import { useProgressStore } from "@/stores/progress";
import type { ProgressItem } from "@/stores/progress";
import type { WSMessage, Notification, OnlineUser } from "@/types/realtime";
import { WS_TYPES } from "@/types/realtime";
import { ReconnectOverlay } from "@/components/ReconnectOverlay";
import { buildApiUrl, buildWebSocketUrl } from "@/lib/server-url";

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const addUser = useOnlineStore((s) => s.addUser);
  const removeUser = useOnlineStore((s) => s.removeUser);
  const setUsers = useOnlineStore((s) => s.setUsers);
  const upsertProgress = useProgressStore((s) => s.upsert);

  const [disconnected, setDisconnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const wasDisconnectedRef = useRef(false);

  // WebSocket: notifications, online users
  useEffect(() => {
    if (!token) return;

    const ws = new WebSocketManager(buildWebSocketUrl("/api/v1/ws"));

    const unsubOpen = ws.onOpen(() => {
      if (wasDisconnectedRef.current) {
        void queryClient.refetchQueries({ type: "active" });
      }
      wasDisconnectedRef.current = false;
      setDisconnected(false);
      setReconnectAttempt(0);
    });
    const unsubClose = ws.onClose(() => {
      wasDisconnectedRef.current = true;
      setDisconnected(true);
      setReconnectAttempt((a) => a + 1);
    });

    ws.connect(token);

    const unsub = ws.onMessage((data) => {
      const msg = data as WSMessage;
      if (!msg || typeof msg !== "object" || !("type" in msg)) return;

      switch (msg.type) {
        case WS_TYPES.NOTIFICATION: {
          const notification = msg.payload as Notification;
          addNotification(notification);
          toast(notification.title);
          queryClient.invalidateQueries({ queryKey: ["unread-count"] });
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          break;
        }
        case WS_TYPES.USER_ONLINE: {
          const user = msg.payload as OnlineUser;
          addUser(user);
          break;
        }
        case WS_TYPES.USER_OFFLINE: {
          const payload = msg.payload as { user_id: number };
          removeUser(payload.user_id);
          break;
        }
        case "user_list": {
          setUsers(msg.payload as OnlineUser[]);
          break;
        }
      }
    });

    return () => {
      unsub();
      unsubOpen();
      unsubClose();
      ws.disconnect();
    };
  }, [token, queryClient, addNotification, addUser, removeUser, setUsers]);

  // SSE: progress events
  useEffect(() => {
    if (!token) return;

    const sse = new SSEManager(buildApiUrl("/api/v1/sse"));

    const unsub = sse.onEvent("progress", (raw) => {
      const payload = raw as {
        task_id: string;
        label: string;
        current: number;
        total: number;
        percent: number;
        status: string;
        error?: string;
        download_url?: string;
      };
      upsertProgress({
        taskId: payload.task_id,
        label: payload.label,
        current: payload.current,
        total: payload.total,
        percent: payload.percent,
        status: payload.status as ProgressItem["status"],
        error: payload.error,
        downloadUrl: payload.download_url,
      });
    });

    sse.connect(token);

    return () => {
      unsub();
      sse.disconnect();
    };
  }, [token, upsertProgress]);

  return (
    <>
      {children}
      <ReconnectOverlay
        visible={disconnected && Boolean(token)}
        attempt={reconnectAttempt}
      />
    </>
  );
}
