import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Tag } from "@yza/ui";
import { Pause, Play, Trash2, Wifi, WifiOff } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { useAuthStore } from "@/stores/auth";
import { useConnectionStore } from "@/stores/connection";
import { buildEventSourceUrl } from "@/lib/request-url";

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  caller?: string;
}

const LEVEL_OPTIONS = ["all", "debug", "info", "warn", "error"] as const;

const MAX_LOGS = 500;

export default function SystemLogs() {
  const { t } = useTranslation();
  const serverUrl = useConnectionStore((s) => s.serverUrl);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [connected, setConnected] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [keyword, setKeyword] = useState("");
  const terminalRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    if (paused) {
      setConnected(false);
      return;
    }

    const token = useAuthStore.getState().token;
    if (!token) return;

    const source = new EventSource(
      buildEventSourceUrl("/api/v1/system-logs/stream", token, serverUrl),
    );

    source.onopen = () => setConnected(true);

    source.onmessage = (event) => {
      const entry: LogEntry = JSON.parse(event.data);
      setLogs((prev) => {
        const next = [...prev, entry];
        return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
      });
    };

    source.onerror = () => {
      setConnected(false);
    };

    return () => {
      source.close();
      setConnected(false);
    };
  }, [paused, serverUrl]);

  // auto-scroll
  useEffect(() => {
    if (!autoScrollRef.current || !terminalRef.current) return;
    terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [logs]);

  const handleScroll = useCallback(() => {
    const el = terminalRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    autoScrollRef.current = atBottom;
  }, []);

  const filtered = logs.filter((entry) => {
    if (levelFilter !== "all" && entry.level !== levelFilter) return false;
    if (keyword && !entry.message.toLowerCase().includes(keyword.toLowerCase()))
      return false;
    return true;
  });

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 } as Intl.DateTimeFormatOptions);
    } catch {
      return ts;
    }
  };

  return (
    <PageShell
      title={t("systemLogs.title")}
      description={t("systemLogs.description")}
      actions={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Tag tone={connected ? "success" : "danger"}>
            {connected ? (
              <><Wifi size={12} /> {t("systemLogs.connected")}</>
            ) : (
              <><WifiOff size={12} /> {t("systemLogs.disconnected")}</>
            )}
          </Tag>
        </div>
      }
    >
      {/* toolbar */}
      <div className="stc-log-toolbar">
        <div className="stc-log-levels">
          {LEVEL_OPTIONS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              className={`stc-log-level-btn${levelFilter === lvl ? " stc-log-level-btn--active" : ""}`}
              onClick={() => setLevelFilter(lvl)}
            >
              {lvl === "all" ? t("systemLogs.allLevels") : lvl.toUpperCase()}
            </button>
          ))}
        </div>
        <input
          className="stc-log-search"
          type="text"
          placeholder={t("systemLogs.search")}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button
          type="button"
          className="stc-log-action-btn"
          onClick={() => setPaused((p) => !p)}
          title={paused ? t("systemLogs.resume") : t("systemLogs.pause")}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
          {paused ? t("systemLogs.resume") : t("systemLogs.pause")}
        </button>
        <button
          type="button"
          className="stc-log-action-btn"
          onClick={() => setLogs([])}
          title={t("systemLogs.clear")}
        >
          <Trash2 size={14} />
          {t("systemLogs.clear")}
        </button>
      </div>

      {/* terminal */}
      <div
        className="stc-log-terminal"
        ref={terminalRef}
        onScroll={handleScroll}
      >
        {filtered.map((entry, i) => (
          <div className="stc-log-line" key={i}>
            <span className="stc-log-time">{formatTime(entry.timestamp)}</span>
            <span className={`stc-log-level stc-log-level--${entry.level}`}>
              {entry.level.toUpperCase().padEnd(5)}
            </span>
            <span className="stc-log-msg">{entry.message}</span>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
