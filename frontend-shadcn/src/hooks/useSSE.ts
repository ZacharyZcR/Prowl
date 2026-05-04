import { useEffect, useRef, useState } from "react";
import { SSEManager } from "@/lib/sse";
import { useAuthStore } from "@/stores/auth";

export function useSSE(url: string, eventName = "message") {
  const sseRef = useRef<SSEManager | null>(null);
  const [lastEvent, setLastEvent] = useState<unknown>(null);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    const sse = new SSEManager(url);
    sseRef.current = sse;
    sse.onEvent(eventName, setLastEvent);
    sse.connect(token ?? undefined);

    return () => {
      sse.disconnect();
      sseRef.current = null;
    };
  }, [url, eventName, token]);

  return { lastEvent };
}
