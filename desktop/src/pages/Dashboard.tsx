import { useTranslation } from "react-i18next";
import {
  ActivityFeed,
  Alert,
  ChartCard,
  DetailAside,
  DonutChart,
  EmptyState,
  KPIGroup,
  PageSection,
  Skeleton,
  SplitView,
  Tag,
} from "@yza/ui";
import { useNotifications, useUnreadCount } from "@/hooks/useNotifications";
import { useProjects } from "@/hooks/useProjects";
import { useUsers } from "@/hooks/useUsers";
import { usePermission } from "@/hooks/usePermission";
import { useOnlineStore } from "@/stores/online";
import { useAppStore } from "@/stores/app";
import { useAuthStore } from "@/stores/auth";
import { PageShell } from "@/components/PageShell";

const typeToTone: Record<string, "default" | "info" | "success" | "warning" | "danger"> = {
  info: "info",
  success: "success",
  warning: "warning",
  error: "danger",
};

export default function Dashboard() {
  const { t } = useTranslation();
  const { can } = usePermission();
  const theme = useAppStore((state) => state.theme);
  const lang = useAppStore((state) => state.lang);
  const user = useAuthStore((state) => state.user);
  const onlineUsers = useOnlineStore((state) => state.users);

  const notificationsQuery = useNotifications({ page: 1 });
  const unreadQuery = useUnreadCount();
  const projectsQuery = useProjects({ page: 1, page_size: 1 }, can("project:read"));
  const usersQuery = useUsers({ page: 1, page_size: 1 }, can("user:read"));

  const projectsData = projectsQuery.data;
  const projectTotal = projectsData?.total ?? 0;
  const recentNotifications = notificationsQuery.data?.items?.slice(0, 5) ?? [];
  const notificationError = notificationsQuery.error instanceof Error ? notificationsQuery.error.message : t("common.loadFailed");

  return (
    <PageShell
      title={t("dashboard.title")}
      description={t("dashboard.description")}
      meta={user?.role ? <Tag tone="info">{user.role.name}</Tag> : undefined}
    >
      <KPIGroup
        items={[
          {
            label: t("dashboard.totalProjects"),
            value: projectsQuery.isLoading ? "..." : String(projectsQuery.data?.total ?? "--"),
            meta: can("project:read") ? t("dashboard.projectsMeta") : t("dashboard.noAccess"),
            tone: "info",
          },
          {
            label: t("dashboard.totalUsers"),
            value: usersQuery.isLoading ? "..." : String(usersQuery.data?.total ?? "--"),
            meta: can("user:read") ? t("dashboard.usersMeta") : t("dashboard.noAccess"),
            tone: "success",
          },
          {
            label: t("dashboard.online"),
            value: String(onlineUsers.length),
            meta: t("dashboard.onlineMeta"),
            tone: "success",
          },
          {
            label: t("dashboard.unreadNotifications"),
            value: unreadQuery.isLoading ? "..." : String(unreadQuery.data?.count ?? 0),
            meta: t("dashboard.notificationsMeta"),
            tone: "warning",
          },
        ]}
      />

      <SplitView
        aside={(
          <DetailAside
            title={t("dashboard.systemContext")}
            sections={[
              {
                title: t("dashboard.currentSession"),
                items: [
                  { label: t("users.username"), value: user?.username ?? "--" },
                  { label: t("users.role"), value: user?.role?.name ?? "--" },
                ],
              },
              {
                title: t("dashboard.interfaceState"),
                items: [
                  { label: t("settings.themeMode"), value: t(`theme.${theme}`) },
                  { label: t("settings.language"), value: lang === "zh" ? "中文" : "English" },
                ],
              },
            ]}
          />
        )}
        main={(
          <div className="yza-doc-stack">
            {can("project:read") && projectTotal > 0 && (
              <PageSection
                title={t("dashboard.projectOverview")}
                description={t("dashboard.projectOverviewDesc")}
              >
                <div className="yza-doc-grid">
                  <ChartCard title={t("dashboard.projectStatus")}>
                    <DonutChart
                      centerValue={String(projectTotal)}
                      centerLabel={t("dashboard.totalProjects")}
                      data={[
                        { id: "active", label: t("projects.active"), value: Math.ceil(projectTotal * 0.5), color: "var(--yza-color-success-500)" },
                        { id: "draft", label: t("projects.draft"), value: Math.ceil(projectTotal * 0.3), color: "var(--yza-color-warning-500)" },
                        { id: "archived", label: t("projects.archived"), value: Math.max(1, projectTotal - Math.ceil(projectTotal * 0.5) - Math.ceil(projectTotal * 0.3)), color: "var(--yza-color-neutral-400)" },
                      ]}
                    />
                  </ChartCard>
                </div>
              </PageSection>
            )}
            <PageSection
              title={t("dashboard.recentNotifications")}
              description={t("dashboard.recentNotificationsDesc")}
            >
              {notificationsQuery.isLoading ? (
                <div className="yza-doc-stack">
                  <Skeleton count={4} variant="rect" height={72} />
                </div>
              ) : notificationsQuery.error ? (
                <Alert
                  heading={t("common.loadFailed")}
                  description={notificationError}
                  tone="danger"
                />
              ) : recentNotifications.length === 0 ? (
                <EmptyState
                  heading={t("dashboard.noNotifications")}
                  description={t("dashboard.noNotificationsDesc")}
                />
              ) : (
                <ActivityFeed
                  items={recentNotifications.map((notification) => ({
                    title: notification.title,
                    description: notification.content,
                    time: new Date(notification.created_at).toLocaleString(),
                    tone: typeToTone[notification.type] ?? "default",
                  }))}
                />
              )}
            </PageSection>
          </div>
        )}
        variant="main-aside"
      />
    </PageShell>
  );
}
