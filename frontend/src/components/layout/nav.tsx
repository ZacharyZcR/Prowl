import type { ReactNode } from "react";
import type { SidebarSection } from "@yza/ui";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  FolderKanban,
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
  FileBox,
  Timer,
  Megaphone,
  BookOpen,
  ListTodo,
  KeySquare,
  Flag,
  Trophy,
  Swords,
  Container,
  Monitor,
} from "lucide-react";
import { useAppStore } from "@/stores/app";
import { getPrimaryModifierLabel } from "@/lib/platform";

export interface NavEntry {
  id: string;
  labelKey: string;
  sectionKey: string;
  path: string;
  permission?: string;
  icon: ReactNode;
}

const ICON_SIZE = 18;

export const NAV_ITEMS: NavEntry[] = [
  { id: "dashboard", labelKey: "nav.dashboard", sectionKey: "nav.section.overview", path: "/dashboard", icon: <LayoutDashboard size={ICON_SIZE} /> },
  { id: "ctf-challenges", labelKey: "nav.ctfChallenges", sectionKey: "nav.section.ctf", path: "/ctf/challenges", permission: "challenge:read", icon: <Flag size={ICON_SIZE} /> },
  { id: "ctf-competitions", labelKey: "nav.ctfCompetitions", sectionKey: "nav.section.ctf", path: "/ctf", permission: "competition:read", icon: <Trophy size={ICON_SIZE} /> },
  { id: "awd-services", labelKey: "nav.awdServices", sectionKey: "nav.section.awd", path: "/awd/challenges", permission: "challenge:read", icon: <Flag size={ICON_SIZE} /> },
  { id: "awd-competitions", labelKey: "nav.awdCompetitions", sectionKey: "nav.section.awd", path: "/awd", permission: "competition:read", icon: <Swords size={ICON_SIZE} /> },
  { id: "redblue-scenarios", labelKey: "nav.redblueScenarios", sectionKey: "nav.section.redblue", path: "/redblue/scenarios", permission: "competition:read", icon: <Flag size={ICON_SIZE} /> },
  { id: "redblue-competitions", labelKey: "nav.redblueCompetitions", sectionKey: "nav.section.redblue", path: "/redblue", permission: "competition:read", icon: <Shield size={ICON_SIZE} /> },
  { id: "teams", labelKey: "nav.teams", sectionKey: "nav.section.general", path: "/teams", permission: "team:read", icon: <Users size={ICON_SIZE} /> },
  { id: "docker-images", labelKey: "nav.dockerImages", sectionKey: "nav.section.docker", path: "/docker/images", permission: "container:read", icon: <Container size={ICON_SIZE} /> },
  { id: "docker-containers", labelKey: "nav.dockerContainers", sectionKey: "nav.section.docker", path: "/docker/containers", permission: "container:read", icon: <Monitor size={ICON_SIZE} /> },
  { id: "users", labelKey: "nav.users", sectionKey: "nav.section.system", path: "/users", permission: "user:read", icon: <Users size={ICON_SIZE} /> },
  { id: "roles", labelKey: "nav.roles", sectionKey: "nav.section.system", path: "/roles", permission: "role:read", icon: <Shield size={ICON_SIZE} /> },
  { id: "permissions", labelKey: "nav.permissions", sectionKey: "nav.section.system", path: "/permissions", permission: "role:read", icon: <KeyRound size={ICON_SIZE} /> },
  { id: "activities", labelKey: "nav.activities", sectionKey: "nav.section.system", path: "/activities", permission: "activity:read", icon: <Activity size={ICON_SIZE} /> },
  { id: "login-logs", labelKey: "nav.loginLogs", sectionKey: "nav.section.system", path: "/login-logs", permission: "activity:read", icon: <LogIn size={ICON_SIZE} /> },
  { id: "error-logs", labelKey: "nav.errorLogs", sectionKey: "nav.section.system", path: "/error-logs", permission: "error_log:read", icon: <AlertTriangle size={ICON_SIZE} /> },
  { id: "health-monitor", labelKey: "nav.healthMonitor", sectionKey: "nav.section.system", path: "/health-monitor", permission: "system:settings", icon: <HeartPulse size={ICON_SIZE} /> },
  { id: "system-logs", labelKey: "nav.systemLogs", sectionKey: "nav.section.system", path: "/system-logs", permission: "system:settings", icon: <Terminal size={ICON_SIZE} /> },
  { id: "webhooks", labelKey: "nav.webhooks", sectionKey: "nav.section.system", path: "/webhooks", permission: "system:settings", icon: <Webhook size={ICON_SIZE} /> },
  { id: "cron-jobs", labelKey: "nav.cronJobs", sectionKey: "nav.section.system", path: "/cron-jobs", permission: "cron:read", icon: <Timer size={ICON_SIZE} /> },
  { id: "announcements", labelKey: "nav.announcements", sectionKey: "nav.section.system", path: "/announcements", permission: "announcement:read", icon: <Megaphone size={ICON_SIZE} /> },
  { id: "dictionaries", labelKey: "nav.dictionaries", sectionKey: "nav.section.system", path: "/dictionaries", permission: "dict:read", icon: <BookOpen size={ICON_SIZE} /> },
  { id: "task-queue", labelKey: "nav.taskQueue", sectionKey: "nav.section.system", path: "/task-queue", permission: "system:settings", icon: <ListTodo size={ICON_SIZE} /> },
  { id: "files", labelKey: "nav.files", sectionKey: "nav.section.system", path: "/files", permission: "upload:create", icon: <FileBox size={ICON_SIZE} /> },
  { id: "api-keys", labelKey: "nav.apiKeys", sectionKey: "nav.section.system", path: "/api-keys", icon: <KeySquare size={ICON_SIZE} /> },
  { id: "system-settings", labelKey: "nav.systemSettings", sectionKey: "nav.section.system", path: "/system-settings", permission: "system:settings", icon: <Wrench size={ICON_SIZE} /> },
  { id: "settings", labelKey: "nav.settings", sectionKey: "nav.section.system", path: "/settings", icon: <Settings size={ICON_SIZE} /> },
];

export function ThemeToggle() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const { t } = useTranslation();
  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const icon = theme === "light" ? "\u2600" : theme === "dark" ? "\u263E" : "\u25D0";

  return (
    <button
      className="stc-icon-btn"
      onClick={() => setTheme(next)}
      title={t("theme.switchTo", { mode: t(`theme.${next}`) })}
      aria-label={t("theme.switchTo", { mode: t(`theme.${next}`) })}
      type="button"
    >
      {icon}
    </button>
  );
}

export function LangToggle() {
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);
  const { t } = useTranslation();
  const next = lang === "zh" ? "en" : "zh";

  return (
    <button
      className="stc-icon-btn"
      onClick={() => setLang(next)}
      title={next === "en" ? t("common.switchToEnglish") : t("common.switchToChinese")}
      aria-label={next === "en" ? t("common.switchToEnglish") : t("common.switchToChinese")}
      type="button"
    >
      {lang === "zh" ? "En" : "\u4E2D"}
    </button>
  );
}

export function CommandPaletteTrigger() {
  const { t } = useTranslation();
  const mod = getPrimaryModifierLabel();
  const shortcut = mod === "\u2318" ? `${mod}K` : `${mod} K`;

  return (
    <button
      className="stc-command-trigger"
      onClick={() => window.dispatchEvent(new CustomEvent("stc:toggle-command-palette"))}
      type="button"
      aria-label={t("commandPalette.open")}
      title={t("commandPalette.open")}
    >
      <span className="stc-command-trigger__label">{t("commandPalette.open")}</span>
      <kbd className="stc-kbd stc-command-trigger__kbd">{shortcut}</kbd>
    </button>
  );
}

export function buildSidebarSections(
  visibleItems: NavEntry[],
  activePath: string,
  t: (key: string) => string,
): SidebarSection[] {
  const groups = new Map<string, SidebarSection>();

  let bestMatch = "";
  for (const item of visibleItems) {
    if ((activePath === item.path || activePath.startsWith(item.path + "/")) && item.path.length > bestMatch.length) {
      bestMatch = item.path;
    }
  }

  for (const item of visibleItems) {
    let section = groups.get(item.sectionKey);
    if (!section) {
      section = {
        id: item.sectionKey,
        title: t(item.sectionKey),
        items: [],
      };
      groups.set(item.sectionKey, section);
    }

    section.items.push({
      id: item.id,
      label: (
        <span className="stc-nav-label" title={t(item.labelKey)} data-path={item.path}>
          <span className="stc-nav-label__icon">{item.icon}</span>
          <span className="stc-nav-label__text">{t(item.labelKey)}</span>
        </span>
      ),
      active: item.path === bestMatch,
    });
  }

  return Array.from(groups.values());
}
