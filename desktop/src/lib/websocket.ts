type MessageHandler = (data: unknown) => void;

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers = new Set<MessageHandler>();
  private typedHandlers = new Map<string, Set<MessageHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30_000;
  private shouldReconnect = true;
  private openCallbacks = new Set<() => void>();
  private closeCallbacks = new Set<() => void>();

  constructor(url: string) {
    this.url = url;
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  connect(token?: string) {
    this.shouldReconnect = true;
    const sep = this.url.includes("?") ? "&" : "?";
    const fullUrl = token ? `${this.url}${sep}token=${token}` : this.url;
    this.ws = new WebSocket(fullUrl);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.startHeartbeat();
      this.openCallbacks.forEach((cb) => cb());
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        this.handlers.forEach((h) => h(data));
        if (data && typeof data === "object" && "type" in data) {
          const typed = this.typedHandlers.get(data.type as string);
          typed?.forEach((h) => h(data));
        }
      } catch {
        this.handlers.forEach((h) => h(event.data));
      }
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.closeCallbacks.forEach((cb) => cb());
      if (this.shouldReconnect) this.scheduleReconnect(token);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    this.stopHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  send(data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(typeof data === "string" ? data : JSON.stringify(data));
    }
  }

  onMessage(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  onTyped(type: string, handler: MessageHandler) {
    if (!this.typedHandlers.has(type)) {
      this.typedHandlers.set(type, new Set());
    }
    this.typedHandlers.get(type)!.add(handler);
    return () => {
      this.typedHandlers.get(type)?.delete(handler);
    };
  }

  onOpen(cb: () => void) {
    this.openCallbacks.add(cb);
    return () => {
      this.openCallbacks.delete(cb);
    };
  }

  onClose(cb: () => void) {
    this.closeCallbacks.add(cb);
    return () => {
      this.closeCallbacks.delete(cb);
    };
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: "heartbeat", timestamp: Date.now() });
    }, 30_000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(token?: string) {
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(
        this.reconnectDelay * 2,
        this.maxReconnectDelay,
      );
      this.connect(token);
    }, this.reconnectDelay);
  }
}
