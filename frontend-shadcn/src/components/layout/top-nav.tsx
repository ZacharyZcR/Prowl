import { useLocation, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Languages, LogOut, Moon, Settings, Sun } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/stores/app";
import { useAuthStore } from "@/stores/auth";

const PAGE_NAMES: Record<string, string> = {
  "/dashboard": "nav.dashboard",
  "/projects": "nav.projects",
  "/users": "nav.users",
  "/roles": "nav.roles",
  "/permissions": "nav.permissions",
  "/activities": "nav.activities",
  "/login-logs": "nav.loginLogs",
  "/error-logs": "nav.errorLogs",
  "/health-monitor": "nav.healthMonitor",
  "/system-logs": "nav.systemLogs",
  "/webhooks": "nav.webhooks",
  "/cron-jobs": "nav.cronJobs",
  "/announcements": "nav.announcements",
  "/dictionaries": "nav.dictionaries",
  "/task-queue": "nav.taskQueue",
  "/files": "nav.files",
  "/api-keys": "nav.apiKeys",
  "/system-settings": "nav.systemSettings",
  "/settings": "nav.settings",
};

export function TopNav() {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useAppStore();
  const { user, logout } = useAuthStore();

  const pageKey = PAGE_NAMES[pathname];
  const pageTitle = pageKey ? t(pageKey) : "";

  const isDark = theme === "dark";

  const toggleTheme = () => setTheme(isDark ? "light" : "dark");
  const toggleLang = () =>
    i18n.changeLanguage(i18n.language === "zh" ? "en" : "zh");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <header className="flex h-14 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-2" />
      <Separator orientation="vertical" className="h-4" />

      <span className="text-sm font-medium">{pageTitle}</span>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleLang}>
          <Languages className="size-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-sm font-medium">
              {user?.username}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <Settings className="mr-2 size-4" />
                {t("nav.settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 size-4" />
              {t("common.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
