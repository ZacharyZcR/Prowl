type EventHandler = (data: unknown) => void;

export class SSEManager {
  private source: EventSource | null = null;
  private url: string;
  private handlers = new Map<string, Set<EventHandler>>();

  constructor(url: string) {
    this.url = url;
  }

  connect(token?: string) {
    const sep = this.url.includes("?") ? "&" : "?";
    const fullUrl = token ? `${this.url}${sep}token=${token}` : this.url;
    this.source = new EventSource(fullUrl);

    this.source.onmessage = (event) => {
      this.dispatch("message", event.data);
    };

    this.source.onerror = () => {
      // EventSource auto-reconnects
    };

    // Re-attach named event listeners
    for (const eventName of this.handlers.keys()) {
      if (eventName !== "message") {
        this.source.addEventListener(eventName, (event) => {
          this.dispatch(eventName, (event as MessageEvent).data);
        });
      }
    }
  }

  disconnect() {
    this.source?.close();
    this.source = null;
  }

  onEvent(eventName: string, handler: EventHandler) {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());

      // Attach to existing source if connected
      if (this.source && eventName !== "message") {
        this.source.addEventListener(eventName, (event) => {
          this.dispatch(eventName, (event as MessageEvent).data);
        });
      }
    }
    this.handlers.get(eventName)!.add(handler);

    return () => {
      this.handlers.get(eventName)?.delete(handler);
    };
  }

  private dispatch(eventName: string, raw: string) {
    const handlers = this.handlers.get(eventName);
    if (!handlers) return;
    try {
      const data = JSON.parse(raw);
      handlers.forEach((h) => h(data));
    } catch {
      handlers.forEach((h) => h(raw));
    }
  }
}
