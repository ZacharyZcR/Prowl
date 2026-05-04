import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Alert, Button, Drawer, EmptyState, Pagination, Skeleton, Tabs, Tag } from "@yza/ui";
import { toast } from "sonner";
import { useNotificationStore } from "@/stores/notification";
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead } from "@/hooks/useNotifications";
import { EmptyScene } from "@/components/EmptyScene";
import { formatDate } from "@/lib/datetime";

const typeToTone: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
  info: "info",
  success: "success",
  warning: "warning",
  error: "danger",
};

function formatTime(iso: string, t: (k: string, opts?: Record<string, unknown>) => string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return t("notifications.justNow");
  if (diff < 3_600_000) return t("notifications.mAgo", { n: Math.floor(diff / 60_000) });
  if (diff < 86_400_000) return t("notifications.hAgo", { n: Math.floor(diff / 3_600_000) });
  return formatDate(iso);
}

function NotificationList({ unreadOnly }: { unreadOnly: boolean }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [, forceUpdate] = useState(0);
  const { data, error, isLoading, refetch } = useNotifications({ page, unread_only: unreadOnly || undefined });

  useEffect(() => {
    const timer = setInterval(() => forceUpdate((n) => n + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [unreadOnly]);

  const markRead = useMarkRead();

  async function handleMarkRead(id: number) {
    setPendingIds((current) => new Set(current).add(id));
    try {
      await markRead.mutateAsync(id);
    } catch {
      toast.error(t("notifications.markReadFailed"));
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  if (isLoading) {
    return (
      <div className="stc-notification-loading">
        <Skeleton count={4} variant="rect" height={72} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="yza-doc-stack">
        <Alert
          heading={t("notifications.loadFailed")}
          description={error instanceof Error ? error.message : t("common.loadFailed")}
          tone="danger"
        />
        <div>
          <Button size="sm" tone="outline" onClick={() => void refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  const items = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<EmptyScene theme="notification" size={96} />}
        heading={t("notifications.noNotifications")}
        description={unreadOnly ? t("notifications.noUnread") : t("common.noData")}
      />
    );
  }

  return (
    <div className="stc-notification-list">
      {items.map((n) => (
        <div
          className={`stc-notification-item${n.read ? "" : " stc-notification-item--unread"}`}
          key={n.id}
        >
          <div className="stc-notification-item__header">
            <Tag tone={typeToTone[n.type] ?? "neutral"}>{n.type}</Tag>
            <span className="stc-notification-item__time">{formatTime(n.created_at, t)}</span>
          </div>
          <div className="stc-notification-item__title">{n.title}</div>
          <div className="stc-notification-item__content">{n.content}</div>
          {!n.read && (
            <Button
              size="sm"
              tone="neutral"
              disabled={pendingIds.has(n.id)}
              aria-busy={pendingIds.has(n.id)}
              onClick={() => { void handleMarkRead(n.id); }}
            >
              {t("notifications.markRead")}
            </Button>
          )}
        </div>
      ))}
      {totalPages > 1 && (
        <div className="stc-notification-pagination">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}

export function NotificationCenter() {
  const { t } = useTranslation();
  const { drawerOpen, toggleDrawer, unreadCount } = useNotificationStore();
  const { data: unreadData } = useUnreadCount();
  const markAllRead = useMarkAllRead();

  const count = unreadData?.count ?? unreadCount;

  return (
    <>
      <button
        className="stc-bell"
        onClick={toggleDrawer}
        type="button"
        aria-label={t("notifications.title")}
        aria-expanded={drawerOpen}
        title={t("notifications.title")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && <span className="stc-bell__badge">{count > 99 ? "99+" : count}</span>}
      </button>

      {drawerOpen && createPortal(
        <Drawer
          open={drawerOpen}
          onClose={toggleDrawer}
          title={t("notifications.title")}
          footer={
            <Button
              size="sm"
              tone="outline"
              onClick={() =>
                markAllRead.mutate(undefined, {
                  onError: () => toast.error(t("notifications.markAllReadFailed")),
                })
              }
              disabled={count === 0 || markAllRead.isPending}
              aria-busy={markAllRead.isPending}
            >
              {markAllRead.isPending
                ? t("notifications.markingAllRead")
                : t("notifications.markAllRead")}
            </Button>
          }
        >
          <div className="stc-notification-drawer">
            <Tabs
              items={[
                { id: "all", label: t("notifications.all"), content: <NotificationList unreadOnly={false} /> },
                { id: "unread", label: t("notifications.unread"), content: <NotificationList unreadOnly={true} /> },
              ]}
            />
          </div>
        </Drawer>,
        document.body,
      )}
    </>
  );
}
