import { useTranslation } from "react-i18next";
import { Bell, FolderKanban, Users, Wifi } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { useProjects } from "@/hooks/useProjects";
import { useUsers } from "@/hooks/useUsers";
import { useNotifications, useUnreadCount } from "@/hooks/useNotifications";
import { formatDateTime } from "@/lib/datetime";

export default function Dashboard() {
  const { t } = useTranslation();

  const { data: projectsData } = useProjects({ page: 1, page_size: 1 });
  const { data: usersData } = useUsers({ page: 1, page_size: 1 });
  const { data: unreadData } = useUnreadCount();
  const { data: notificationsData } = useNotifications({ page: 1 });

  const recentNotifications = notificationsData?.items?.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title={t("dashboard.title")} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title={t("dashboard.totalProjects")}
          value={projectsData?.total ?? 0}
          icon={<FolderKanban className="h-5 w-5" />}
        />
        <StatCard
          title={t("dashboard.totalUsers")}
          value={usersData?.total ?? 0}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title={t("dashboard.online")}
          value={0}
          icon={<Wifi className="h-5 w-5" />}
        />
        <StatCard
          title={t("dashboard.unreadNotifications")}
          value={unreadData?.count ?? 0}
          icon={<Bell className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.recentNotifications")}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentNotifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("dashboard.noNotifications")}
            </p>
          ) : (
            <div className="space-y-4">
              {recentNotifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {n.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{n.content}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(n.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
