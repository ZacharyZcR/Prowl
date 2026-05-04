import { useEffect } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { WebSocketManager } from "@/lib/websocket";
import { useAuthStore } from "@/stores/auth";
import { useConnectionStore } from "@/stores/connection";
import { useNotificationStore } from "@/stores/notification";
import { useOnlineStore } from "@/stores/online";
import type { WSMessage, Notification, OnlineUser } from "@/types/realtime";
import { WS_TYPES } from "@/types/realtime";
import { buildWebSocketUrl } from "@/lib/request-url";

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const serverUrl = useConnectionStore((s) => s.serverUrl);
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const addUser = useOnlineStore((s) => s.addUser);
  const removeUser = useOnlineStore((s) => s.removeUser);
  const setUsers = useOnlineStore((s) => s.setUsers);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const wsUrl = buildWebSocketUrl("/api/v1/ws", serverUrl);
    const ws = new WebSocketManager(wsUrl);
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
      ws.disconnect();
    };
  }, [isAuthenticated, token, serverUrl, queryClient, addNotification, addUser, removeUser, setUsers]);

  return <>{children}</>;
}
