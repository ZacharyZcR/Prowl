import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { animate, stagger, createTimeline } from "animejs";
import {
  ActivityFeed,
  EmptyState,
  KPIGroup,
  PageSection,
  Skeleton,
  Tag,
} from "@yza/ui";
import { EmptyScene } from "@/components/EmptyScene";
import { useNotifications, useUnreadCount } from "@/hooks/useNotifications";
import { useUsers } from "@/hooks/useUsers";
import { usePermission } from "@/hooks/usePermission";
import { useOnlineStore } from "@/stores/online";
import { useAuthStore } from "@/stores/auth";
import { PageShell } from "@/components/PageShell";
import { useReducedMotion } from "@/hooks/useMotionPreferences";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";

const typeToTone: Record<string, "default" | "info" | "success" | "warning" | "danger"> = {
  info: "info", success: "success", warning: "warning", error: "danger",
};

const MODE_TONE: Record<string, "info" | "danger" | "warning"> = {
  ctf_jeopardy: "info", awd: "danger", red_blue: "warning",
};
const MODE_LABEL: Record<string, string> = {
  ctf_jeopardy: "CTF", awd: "AWD", red_blue: "红蓝",
};
const STATUS_LABEL: Record<string, string> = {
  running: "进行中", registration: "报名中", ended: "已结束", archived: "已归档", draft: "草稿", paused: "已暂停",
};

interface Competition {
  id: number; title: string; mode: string; status: string;
  team_count: number; challenge_count: number;
  start_time?: string; end_time?: string;
}
interface InstanceStats {
  total_instances: number; running_instances: number; stopped_instances: number; error_instances: number;
}

function KPISection() {
  const { t } = useTranslation();
  const { can } = usePermission();
  const onlineUsers = useOnlineStore((state) => state.users);
  const usersQuery = useUsers({ page: 1, page_size: 1 }, can("user:read"));
  const unreadQuery = useUnreadCount();

  const compsQuery = useQuery({
    queryKey: ["dashboard-comps"],
    queryFn: () => api.get<{ total: number; items: Competition[] }>("/api/v1/competitions?page=1&page_size=100").then((r) => r.data),
    enabled: can("competition:read"),
  });
  const teamsQuery = useQuery({
    queryKey: ["dashboard-teams"],
    queryFn: () => api.get<{ total: number }>("/api/v1/admin/teams?page=1&page_size=1").then((r) => r.data),
    enabled: can("team:read"),
  });
  const instancesQuery = useQuery({
    queryKey: ["dashboard-instances"],
    queryFn: () => api.get<InstanceStats>("/api/v1/admin/instances/stats").then((r) => r.data),
    enabled: can("container:read"),
  });

  const comps = compsQuery.data?.items ?? [];
  const runningComps = comps.filter((c) => c.status === "running").length;

  return (
    <KPIGroup
      items={[
        {
          label: t("dashboard.competitions"),
          value: compsQuery.isLoading ? "..." : String(compsQuery.data?.total ?? 0),
          meta: `${runningComps} ${t("dashboard.running")}`,
          tone: "info",
        },
        {
          label: t("dashboard.totalTeams"),
          value: teamsQuery.isLoading ? "..." : String(teamsQuery.data?.total ?? 0),
          meta: t("dashboard.teamsMeta"),
          tone: "success",
        },
        {
          label: t("dashboard.totalUsers"),
          value: usersQuery.isLoading ? "..." : String(usersQuery.data?.total ?? 0),
          meta: `${onlineUsers.length} ${t("dashboard.online")}`,
          tone: "success",
        },
        {
          label: t("dashboard.containers"),
          value: instancesQuery.isLoading ? "..." : String(instancesQuery.data?.running_instances ?? 0),
          meta: `${instancesQuery.data?.total_instances ?? 0} ${t("dashboard.totalInstances")}`,
          tone: instancesQuery.data?.error_instances ? "danger" : "info",
        },
        {
          label: t("dashboard.unreadNotifications"),
          value: unreadQuery.isLoading ? "..." : String(unreadQuery.data?.count ?? 0),
          meta: t("dashboard.notificationsMeta"),
          tone: "warning",
        },
      ]}
    />
  );
}

function CompetitionSection() {
  const { t } = useTranslation();
  const { can } = usePermission();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-comps"],
    queryFn: () => api.get<{ total: number; items: Competition[] }>("/api/v1/competitions?page=1&page_size=100").then((r) => r.data),
    enabled: can("competition:read"),
  });

  const comps = data?.items ?? [];
  const running = comps.filter((c) => c.status === "running");
  const recent = comps.filter((c) => c.status !== "running").slice(0, 5);

  if (!can("competition:read")) return null;

  return (
    <PageSection title={t("dashboard.competitionOverview")} description={t("dashboard.competitionOverviewDesc")}>
      {isLoading ? (
        <Skeleton count={3} variant="rect" height={56} />
      ) : comps.length === 0 ? (
        <EmptyState icon={<EmptyScene theme="notification" />} heading={t("dashboard.noCompetitions")} description="" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--yza-space-2)" }}>
          {running.length > 0 && (
            <div style={{ marginBottom: "var(--yza-space-2)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--yza-color-success-600)", marginBottom: 6 }}>
                {t("dashboard.running")} ({running.length})
              </div>
              {running.map((c) => <CompRow key={c.id} comp={c} />)}
            </div>
          )}
          {recent.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--yza-text-muted)", marginBottom: 6 }}>
                {t("dashboard.recentComps")}
              </div>
              {recent.map((c) => <CompRow key={c.id} comp={c} />)}
            </div>
          )}
        </div>
      )}
    </PageSection>
  );
}

function CompRow({ comp: c }: { comp: Competition }) {
  return (
    <Link to={competitionDetailPath(c)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: "var(--yza-radius-md)", border: "1px solid var(--yza-border-subtle)", background: "var(--yza-surface-canvas)", textDecoration: "none", color: "inherit", marginBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Tag tone={MODE_TONE[c.mode] ?? "neutral"}>{MODE_LABEL[c.mode] ?? c.mode}</Tag>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{c.title}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--yza-text-muted)" }}>
        <span>{c.team_count} 队</span>
        <Tag tone={c.status === "running" ? "success" : "neutral"}>{STATUS_LABEL[c.status] ?? c.status}</Tag>
      </div>
    </Link>
  );
}

function competitionDetailPath(comp: Competition) {
  return `/competitions/${comp.id}`;
}

function NotificationSection() {
  const { t } = useTranslation();
  const notificationsQuery = useNotifications({ page: 1 });
  const recentNotifications = notificationsQuery.data?.items?.slice(0, 5) ?? [];

  return (
    <PageSection title={t("dashboard.recentNotifications")} description={t("dashboard.recentNotificationsDesc")}>
      {notificationsQuery.isLoading ? (
        <Skeleton count={3} variant="rect" height={56} />
      ) : recentNotifications.length === 0 ? (
        <EmptyState icon={<EmptyScene theme="notification" />} heading={t("dashboard.noNotifications")} description={t("dashboard.noNotificationsDesc")} />
      ) : (
        <ActivityFeed
          items={recentNotifications.map((n) => ({
            title: n.title,
            description: n.content,
            time: new Date(n.created_at).toLocaleString(),
            tone: typeToTone[n.type] ?? "default",
          }))}
        />
      )}
    </PageSection>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const gridRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!gridRef.current || !headerRef.current || reducedMotion) return;
    const tl = createTimeline({ defaults: { ease: "easeOutCubic" } });
    tl.add(headerRef.current, { opacity: [0, 1], translateY: [20, 0], duration: 500 }, 0);
    tl.add(gridRef.current.querySelectorAll(".stc-widget"), {
      opacity: [0, 1], translateY: [30, 0], scale: [0.97, 1], delay: stagger(100), duration: 600,
    }, 150);
    return () => { tl.pause(); };
  }, [reducedMotion]);

  return (
    <PageShell
      title={t("dashboard.title")}
      description={t("dashboard.description")}
      meta={user?.role ? <Tag tone="info">{user.role.name}</Tag> : undefined}
      headerRef={headerRef}
    >
      <div ref={gridRef} className="stc-dashboard-grid stc-dashboard-page__grid">
        <div className="stc-widget"><KPISection /></div>
        <div className="stc-widget"><CompetitionSection /></div>
        <div className="stc-widget"><NotificationSection /></div>
      </div>
    </PageShell>
  );
}
