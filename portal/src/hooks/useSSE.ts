import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth";

interface SSEMessage {
  event: string;
  data: Record<string, unknown>;
}

export function useSSE(onMessage: (msg: SSEMessage) => void) {
  const token = useAuthStore((s) => s.token);
  const cbRef = useRef(onMessage);
  cbRef.current = onMessage;

  useEffect(() => {
    if (!token) return;

    const url = `/api/v1/sse?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as SSEMessage;
        cbRef.current(msg);
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [token]);
}
