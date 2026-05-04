export interface WSMessage {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
}

export const WS_TYPES = {
  NOTIFICATION: "notification",
  USER_ONLINE: "user_online",
  USER_OFFLINE: "user_offline",
  HEARTBEAT: "heartbeat",
} as const;

export interface Notification {
  id: number;
  title: string;
  content: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  created_at: string;
}

export interface OnlineUser {
  user_id: number;
  username: string;
}
