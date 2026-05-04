import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Tag } from "@yza/ui";
import { Pause, Play, Trash2, Wifi, WifiOff } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { useAuthStore } from "@/stores/auth";
import { formatClockTime } from "@/lib/datetime";
import { buildApiUrl } from "@/lib/server-url";

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

    const url = new URL(buildApiUrl("/api/v1/system-logs/stream"));
    url.searchParams.set("token", token);
    const source = new EventSource(url.toString());

    source.onopen = () => setConnected(true);

    source.onmessage = (event) => {
      try {
        const entry: LogEntry = JSON.parse(event.data);
        setLogs((prev) => {
          const next = [...prev, entry];
          return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
        });
      } catch {
        // Ignore malformed stream events and keep the log stream alive.
      }
    };

    source.onerror = () => {
      setConnected(false);
    };

    return () => {
      source.close();
      setConnected(false);
    };
  }, [paused]);

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

  return (
    <PageShell
      title={t("systemLogs.title")}
      description={t("systemLogs.description")}
      actions={
        <div className="stc-inline-meta">
          <Tag tone={paused ? "warning" : connected ? "success" : "danger"}>
            {paused ? (
              t("systemLogs.pausedState")
            ) : connected ? (
              <><Wifi size={12} /> {t("systemLogs.connected")}</>
            ) : (
              <><WifiOff size={12} /> {t("systemLogs.disconnected")}</>
            )}
          </Tag>
          <Tag tone="neutral">
            {t("systemLogs.filteredCount", { filtered: filtered.length, total: logs.length })}
          </Tag>
        </div>
      }
    >
      <section className="yza-doc-card">
        <div className="yza-doc-stack">
          <div className="stc-log-toolbar">
            <div className="stc-log-levels">
              {LEVEL_OPTIONS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  className={`stc-log-level-btn${levelFilter === lvl ? " stc-log-level-btn--active" : ""}`}
                  onClick={() => setLevelFilter(lvl)}
                  aria-pressed={levelFilter === lvl}
                >
                  {lvl === "all" ? t("systemLogs.allLevels") : lvl.toUpperCase()}
                </button>
              ))}
            </div>
            <input
              className="stc-log-search"
              type="text"
              placeholder={t("systemLogs.search")}
              aria-label={t("systemLogs.search")}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <button
              type="button"
              className="stc-log-action-btn"
              onClick={() => setPaused((p) => !p)}
              title={paused ? t("systemLogs.resume") : t("systemLogs.pause")}
              aria-pressed={paused}
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
              {paused ? t("systemLogs.resume") : t("systemLogs.pause")}
            </button>
            <button
              type="button"
              className="stc-log-action-btn"
              onClick={() => setLogs([])}
              title={t("systemLogs.clear")}
              aria-label={t("systemLogs.clear")}
              disabled={logs.length === 0}
            >
              <Trash2 size={14} />
              {t("systemLogs.clear")}
            </button>
          </div>

          <div
            className="stc-log-terminal"
            ref={terminalRef}
            onScroll={handleScroll}
          >
            {filtered.length === 0 ? (
              <div className="stc-log-empty">
                {logs.length === 0 ? t("systemLogs.empty") : t("systemLogs.emptyFiltered")}
              </div>
            ) : (
              filtered.map((entry, i) => (
                <div className="stc-log-line" key={`${entry.timestamp}-${entry.level}-${i}`}>
                  <span className="stc-log-time">{formatClockTime(entry.timestamp, true)}</span>
                  <span className={`stc-log-level stc-log-level--${entry.level}`}>
                    {entry.level.toUpperCase().padEnd(5)}
                  </span>
                  <span className="stc-log-msg">{entry.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
