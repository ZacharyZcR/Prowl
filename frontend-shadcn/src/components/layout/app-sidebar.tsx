import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Clock,
  FileUp,
  FolderKanban,
  HeartPulse,
  Key,
  KeyRound,
  LayoutDashboard,
  ListTodo,
  LogIn,
  Megaphone,
  Settings,
  Shield,
  Terminal,
  UserCog,
  Users,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { usePermission } from "@/hooks/usePermission";

interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
  permission?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "nav.section.overview",
    items: [
      { label: "nav.dashboard", icon: LayoutDashboard, path: "/dashboard" },
    ],
  },
  {
    title: "nav.section.business",
    items: [
      { label: "nav.projects", icon: FolderKanban, path: "/projects", permission: "project:read" },
    ],
  },
  {
    title: "nav.section.system",
    items: [
      { label: "nav.users", icon: Users, path: "/users", permission: "user:read" },
      { label: "nav.roles", icon: Shield, path: "/roles", permission: "role:read" },
      { label: "nav.permissions", icon: Key, path: "/permissions", permission: "role:read" },
      { label: "nav.activities", icon: Activity, path: "/activities", permission: "activity:read" },
      { label: "nav.loginLogs", icon: LogIn, path: "/login-logs", permission: "activity:read" },
      { label: "nav.errorLogs", icon: AlertTriangle, path: "/error-logs", permission: "error_log:read" },
      { label: "nav.healthMonitor", icon: HeartPulse, path: "/health-monitor", permission: "system:settings" },
      { label: "nav.systemLogs", icon: Terminal, path: "/system-logs", permission: "system:settings" },
      { label: "nav.webhooks", icon: Webhook, path: "/webhooks", permission: "system:settings" },
      { label: "nav.cronJobs", icon: Clock, path: "/cron-jobs", permission: "cron:read" },
      { label: "nav.announcements", icon: Megaphone, path: "/announcements", permission: "announcement:read" },
      { label: "nav.dictionaries", icon: BookOpen, path: "/dictionaries", permission: "dict:read" },
      { label: "nav.taskQueue", icon: ListTodo, path: "/task-queue", permission: "system:settings" },
      { label: "nav.files", icon: FileUp, path: "/files", permission: "upload:create" },
      { label: "nav.apiKeys", icon: KeyRound, path: "/api-keys" },
      { label: "nav.systemSettings", icon: Settings, path: "/system-settings", permission: "system:settings" },
      { label: "nav.settings", icon: UserCog, path: "/settings" },
    ],
  },
];

export function AppSidebar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { can } = usePermission();

  const isVisible = (item: NavItem) =>
    !item.permission || can(item.permission);

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">Prowl Range</span>
          <span className="text-xs text-muted-foreground">Console</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(isVisible);
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={section.title}>
              <SidebarGroupLabel>{t(section.title)}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.path}
                      >
                        <Link to={item.path}>
                          <item.icon className="size-4" />
                          <span>{t(item.label)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter />
    </Sidebar>
  );
}
