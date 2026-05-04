import type { ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Breadcrumb, DashboardShell, Sidebar, TopNav, Tag } from "@yza/ui";
import type { SidebarSection } from "@yza/ui";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  FolderKanban,
  Swords,
  Users,
  Shield,
  KeyRound,
  Activity,
  Settings,
  LogIn,
  AlertTriangle,
  Wrench,
  Webhook,
  HeartPulse,
  Terminal,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { useAppStore } from "@/stores/app";
import { usePermission } from "@/hooks/usePermission";
import { resolveBreadcrumbs } from "@/lib/breadcrumbs";
import { NotificationCenter } from "@/components/NotificationCenter";
import { OnlineIndicator } from "@/components/OnlineIndicator";
import { AICopilot } from "@/components/AICopilot";

interface NavEntry {
  id: string;
  labelKey: string;
  sectionKey: string;
  path: string;
  permission?: string;
  icon: ReactNode;
}

const ICON_SIZE = 18;

const NAV_ITEMS: NavEntry[] = [
  { id: "dashboard", labelKey: "nav.dashboard", sectionKey: "nav.section.overview", path: "/dashboard", icon: <LayoutDashboard size={ICON_SIZE} /> },
  { id: "projects", labelKey: "nav.projects", sectionKey: "nav.section.business", path: "/projects", permission: "project:read", icon: <FolderKanban size={ICON_SIZE} /> },
  { id: "competitions", labelKey: "nav.competitions", sectionKey: "nav.section.business", path: "/competitions", permission: "competition:read", icon: <Swords size={ICON_SIZE} /> },
  { id: "users", labelKey: "nav.users", sectionKey: "nav.section.system", path: "/users", permission: "user:read", icon: <Users size={ICON_SIZE} /> },
  { id: "roles", labelKey: "nav.roles", sectionKey: "nav.section.system", path: "/roles", permission: "role:read", icon: <Shield size={ICON_SIZE} /> },
  { id: "permissions", labelKey: "nav.permissions", sectionKey: "nav.section.system", path: "/permissions", permission: "role:read", icon: <KeyRound size={ICON_SIZE} /> },
  { id: "activities", labelKey: "nav.activities", sectionKey: "nav.section.system", path: "/activities", permission: "activity:read", icon: <Activity size={ICON_SIZE} /> },
  { id: "login-logs", labelKey: "nav.loginLogs", sectionKey: "nav.section.system", path: "/login-logs", permission: "activity:read", icon: <LogIn size={ICON_SIZE} /> },
  { id: "error-logs", labelKey: "nav.errorLogs", sectionKey: "nav.section.system", path: "/error-logs", permission: "error_log:read", icon: <AlertTriangle size={ICON_SIZE} /> },
  { id: "health-monitor", labelKey: "nav.healthMonitor", sectionKey: "nav.section.system", path: "/health-monitor", permission: "system:settings", icon: <HeartPulse size={ICON_SIZE} /> },
  { id: "system-logs", labelKey: "nav.systemLogs", sectionKey: "nav.section.system", path: "/system-logs", permission: "system:settings", icon: <Terminal size={ICON_SIZE} /> },
  { id: "webhooks", labelKey: "nav.webhooks", sectionKey: "nav.section.system", path: "/webhooks", permission: "system:settings", icon: <Webhook size={ICON_SIZE} /> },
  { id: "system-settings", labelKey: "nav.systemSettings", sectionKey: "nav.section.system", path: "/system-settings", permission: "system:settings", icon: <Wrench size={ICON_SIZE} /> },
  { id: "settings", labelKey: "nav.settings", sectionKey: "nav.section.system", path: "/settings", icon: <Settings size={ICON_SIZE} /> },
];

function ThemeToggle() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const { t } = useTranslation();
  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const icon = theme === "light" ? "\u2600" : theme === "dark" ? "\u263E" : "\u25D0";
  return (
    <button className="stc-icon-btn" onClick={() => setTheme(next)} title={t(`theme.${theme}`)} aria-label={t(`theme.${theme}`)} type="button">
      {icon}
    </button>
  );
}

function LangToggle() {
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);
  return (
    <button className="stc-icon-btn" onClick={() => setLang(lang === "zh" ? "en" : "zh")} title={lang === "zh" ? "English" : "\u4E2D\u6587"} aria-label={lang === "zh" ? "English" : "\u4E2D\u6587"} type="button">
      {lang === "zh" ? "En" : "\u4E2D"}
    </button>
  );
}

export function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const { can } = usePermission();

  const visibleItems = NAV_ITEMS.filter((item) => !item.permission || can(item.permission));

  function buildSections(activePath: string): SidebarSection[] {
    const groups = new Map<string, SidebarSection>();
    for (const item of visibleItems) {
      const sectionTitle = t(item.sectionKey);
      let section = groups.get(item.sectionKey);
      if (!section) {
        section = { id: item.sectionKey, title: sectionTitle, items: [] };
        groups.set(item.sectionKey, section);
      }
      section.items.push({
        id: item.id,
        label: (
          <span className="stc-nav-label">
            <span className="stc-nav-label__icon">{item.icon}</span>
            <span className="stc-nav-label__text">{t(item.labelKey)}</span>
          </span>
        ),
        active: activePath.startsWith(item.path),
      });
    }
    return Array.from(groups.values());
  }

  const sections = buildSections(location.pathname);
  const avatarInitial = (user?.username ?? "?")[0].toUpperCase();
  const crumbs = resolveBreadcrumbs(location.pathname, t);

  function handleSidebarClick(e: React.MouseEvent) {
    const btn = (e.target as HTMLElement).closest("button.yza-sidebar__item");
    if (!btn) return;
    const allButtons = (e.currentTarget as HTMLElement).querySelectorAll("button.yza-sidebar__item");
    const index = Array.from(allButtons).indexOf(btn as HTMLButtonElement);
    if (index >= 0 && visibleItems[index]) {
      navigate(visibleItems[index].path);
    }
  }

  return (
    <div data-sidebar-collapsed={sidebarCollapsed}>
    <div className="stc-ambient-blobs" aria-hidden="true">
      <div className="stc-blob" />
      <div className="stc-blob" />
    </div>
    <DashboardShell
      header={
        <TopNav
          brand={
            <div className="stc-header-breadcrumb" onClick={(e) => {
              const link = (e.target as HTMLElement).closest<HTMLAnchorElement>("a.yza-breadcrumb__link");
              if (link?.href) { e.preventDefault(); navigate(new URL(link.href).pathname); }
            }} role="presentation">
              {crumbs.length > 0 ? <Breadcrumb items={crumbs} /> : <span className="stc-brand">STC</span>}
            </div>
          }
          items={[]}
          actions={
            <div className="stc-topnav-actions">
              <OnlineIndicator />
              <NotificationCenter />
              <ThemeToggle />
              <LangToggle />
              <div className="stc-user-info">
                {user?.role && <Tag tone="info">{user.role.name}</Tag>}
                <span className="stc-user-info__name">{user?.username ?? ""}</span>
              </div>
              <button
                className="yza-button yza-button--outline yza-button--sm"
                onClick={() => { logout(); navigate("/login", { replace: true }); }}
                type="button"
              >
                {t("common.logout")}
              </button>
            </div>
          }
          profile={avatarInitial}
        />
      }
      sidebar={
        <div onClick={handleSidebarClick} role="navigation" aria-label={t("nav.sidebar")} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Sidebar
            brand={<span className="stc-brand">STC <span className="stc-brand__sub">Console</span></span>}
            sections={sections}
          />
          <div style={{ marginTop: "auto", padding: "12px", textAlign: "center" }}>
            <button
              className="stc-sidebar-toggle"
              onClick={(e) => { e.stopPropagation(); toggleSidebar(); }}
              type="button"
              title={t("common.toggleSidebar")}
            >
              {sidebarCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            </button>
          </div>
        </div>
      }
    >
      <div key={location.pathname} className="stc-route-transition">
        <Outlet />
      </div>
    </DashboardShell>
    <AICopilot />
    </div>
  );
}
