import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button } from "@yza/ui";
import { useActiveAnnouncements, type Announcement } from "@/hooks/useAnnouncements";

const STORAGE_KEY = "stc_dismissed_announcements";

function getDismissedIds(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function dismissId(id: number) {
  const ids = getDismissedIds();
  ids.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
}

function syncDismissedIds(activeIds: number[]) {
  const next = Array.from(getDismissedIds()).filter((id) => activeIds.includes(id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return new Set(next);
}

const TONE_MAP: Record<string, "info" | "warning" | "danger"> = {
  info: "info",
  warning: "warning",
  critical: "danger",
};

export function AnnouncementBanner() {
  const { t } = useTranslation();
  const { data } = useActiveAnnouncements();
  const [dismissed, setDismissed] = useState<Set<number>>(getDismissedIds);

  useEffect(() => {
    setDismissed(syncDismissedIds((data ?? []).map((item: Announcement) => item.id)));
  }, [data]);

  const handleDismiss = useCallback((id: number) => {
    dismissId(id);
    setDismissed((prev) => new Set(prev).add(id));
  }, []);

  const visible = (data ?? []).filter((a: Announcement) => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  return (
    <div className="stc-announcement-list">
      {visible.map((ann: Announcement) => (
        <div key={ann.id} className="stc-announcement-item">
          <Alert
            heading={ann.title}
            description={ann.content}
            tone={TONE_MAP[ann.priority] ?? "info"}
          />
          <Button
            size="sm"
            tone="outline"
            onClick={() => handleDismiss(ann.id)}
            className="stc-announcement-item__dismiss"
            aria-label={`${t("common.dismiss")} ${ann.title}`}
            title={t("common.dismiss")}
          >
            &times;
          </Button>
        </div>
      ))}
    </div>
  );
}
