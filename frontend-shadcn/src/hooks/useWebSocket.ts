import { useEffect, useRef, useCallback, useState } from "react";
import { WebSocketManager } from "@/lib/websocket";
import { useAuthStore } from "@/stores/auth";

type MessageHandler = (data: unknown) => void;

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocketManager | null>(null);
  const [lastMessage, setLastMessage] = useState<unknown>(null);
  const [connected, setConnected] = useState(false);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    const ws = new WebSocketManager(url);
    wsRef.current = ws;
    ws.onMessage(setLastMessage);
    ws.onOpen(() => setConnected(true));
    ws.onClose(() => setConnected(false));
    ws.connect(token ?? undefined);

    return () => {
      ws.disconnect();
      wsRef.current = null;
      setConnected(false);
    };
  }, [url, token]);

  const send = useCallback((data: unknown) => {
    wsRef.current?.send(data);
  }, []);

  const onTyped = useCallback((type: string, handler: MessageHandler) => {
    return wsRef.current?.onTyped(type, handler) ?? (() => {});
  }, []);

  return { lastMessage, send, connected, onTyped };
}
