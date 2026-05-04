import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useProgressStore } from "@/stores/progress";
import { buildApiUrl } from "@/lib/server-url";
import type { ProgressItem } from "@/stores/progress";

function resolveDownloadUrl(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return buildApiUrl(path);
}

function clampPercent(percent: number) {
  return Math.max(0, Math.min(percent, 100));
}

export function ProgressPanel() {
  const { t } = useTranslation();
  const items = useProgressStore((s) => s.items);
  const panelOpen = useProgressStore((s) => s.panelOpen);
  const dismiss = useProgressStore((s) => s.dismiss);
  const clearCompleted = useProgressStore((s) => s.clearCompleted);
  const togglePanel = useProgressStore((s) => s.togglePanel);

  if (items.size === 0) return null;

  const list = Array.from(items.values());
  const hasFinished = list.some((i) => i.status !== "running");
  const running = list.filter((i) => i.status === "running").length;
  const badgeCount = running > 0 ? running : list.length;

  if (!panelOpen) {
    return createPortal(
      <button
        className="stc-progress-fab"
        onClick={togglePanel}
        title={
          running > 0
            ? t("progress.runningSummary", { count: running })
            : t("progress.finishedSummary", { count: list.length })
        }
        type="button"
      >
        <span className="stc-progress-fab__icon">{running > 0 ? "↻" : "✓"}</span>
        {badgeCount > 0 && <span className="stc-progress-fab__badge">{badgeCount}</span>}
      </button>,
      document.body,
    );
  }

  return createPortal(
    <div className="stc-progress-panel">
      <div className="stc-progress-panel__header">
        <span className="stc-progress-panel__title">
          {t("progress.title")}
        </span>
        <div className="stc-progress-panel__actions">
          {hasFinished && (
            <button className="stc-progress-panel__btn" onClick={clearCompleted} type="button">
              {t("progress.clearCompleted")}
            </button>
          )}
          <button
            className="stc-progress-panel__btn"
            onClick={togglePanel}
            type="button"
            aria-label={t("common.close")}
            title={t("common.close")}
          >
            ✕
          </button>
        </div>
      </div>
      <div className="stc-progress-panel__list">
        {list.map((item) => (
          <ProgressRow key={item.taskId} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </div>,
    document.body,
  );
}

function ProgressRow({
  item,
  onDismiss,
}: {
  item: ProgressItem;
  onDismiss: (id: string) => void;
}) {
  const { t } = useTranslation();
  const isRunning = item.status === "running";
  const isCompleted = item.status === "completed";
  const isFailed = item.status === "failed";
  const progress = clampPercent(item.percent);

  return (
    <div className={`stc-progress-row stc-progress-row--${item.status}`}>
      <div className="stc-progress-row__info">
        <span className="stc-progress-row__label">{item.label}</span>
        <span className="stc-progress-row__detail">
          {isRunning && item.total > 0 && `${item.current} / ${item.total} · ${progress}%`}
          {isRunning && item.total === 0 && t("progress.preparing")}
          {isCompleted && `${t("progress.completed")} · ${progress}%`}
          {isFailed && (item.error || t("progress.failed"))}
        </span>
      </div>
      <div
        className="stc-progress-row__bar"
        role="progressbar"
        aria-label={item.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-valuetext={`${progress}%`}
      >
        <div
          className="stc-progress-row__fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="stc-progress-row__actions">
        {isCompleted && item.downloadUrl && (
          <a
            className="stc-progress-row__download"
            href={resolveDownloadUrl(item.downloadUrl)}
            download
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("progress.download")}
          </a>
        )}
        {!isRunning && (
          <button
            className="stc-progress-row__dismiss"
            onClick={() => onDismiss(item.taskId)}
            type="button"
            aria-label={t("common.close")}
            title={t("common.close")}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
