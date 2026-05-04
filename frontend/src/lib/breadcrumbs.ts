import type { BreadcrumbItem } from "@yza/ui";

type BreadcrumbDef = { label: string; path?: string }[];

const MAP: Record<string, BreadcrumbDef> = {
  "/dashboard": [{ label: "nav.dashboard" }],
  "/projects": [{ label: "nav.projects" }],
  "/projects/:id": [
    { label: "nav.projects", path: "/projects" },
    { label: "projects.detail" },
  ],
  "/users": [
    { label: "nav.section.system" },
    { label: "nav.users" },
  ],
  "/roles": [
    { label: "nav.section.system" },
    { label: "nav.roles" },
  ],
  "/permissions": [
    { label: "nav.section.system" },
    { label: "nav.permissions" },
  ],
  "/activities": [
    { label: "nav.section.system" },
    { label: "nav.activities" },
  ],
  "/login-logs": [
    { label: "nav.section.system" },
    { label: "nav.loginLogs" },
  ],
  "/error-logs": [
    { label: "nav.section.system" },
    { label: "nav.errorLogs" },
  ],
  "/health-monitor": [
    { label: "nav.section.system" },
    { label: "nav.healthMonitor" },
  ],
  "/system-logs": [
    { label: "nav.section.system" },
    { label: "nav.systemLogs" },
  ],
  "/webhooks": [
    { label: "nav.section.system" },
    { label: "nav.webhooks" },
  ],
  "/system-settings": [
    { label: "nav.section.system" },
    { label: "nav.systemSettings" },
  ],
  "/cron-jobs": [
    { label: "nav.section.system" },
    { label: "nav.cronJobs" },
  ],
  "/announcements": [
    { label: "nav.section.system" },
    { label: "nav.announcements" },
  ],
  "/dictionaries": [
    { label: "nav.section.system" },
    { label: "nav.dictionaries" },
  ],
  "/task-queue": [
    { label: "nav.section.system" },
    { label: "nav.taskQueue" },
  ],
  "/api-keys": [
    { label: "nav.section.system" },
    { label: "nav.apiKeys" },
  ],
  "/files": [
    { label: "nav.section.system" },
    { label: "nav.files" },
  ],
  "/settings": [
    { label: "nav.section.system" },
    { label: "nav.settings" },
  ],
};

export function resolveBreadcrumbs(
  pathname: string,
  t: (key: string) => string,
): BreadcrumbItem[] {
  // 精确匹配
  let defs = MAP[pathname];

  // 带参数匹配 /projects/:id
  if (!defs) {
    for (const pattern of Object.keys(MAP)) {
      if (!pattern.includes(":")) continue;
      const re = new RegExp(
        "^" + pattern.replace(/:[^/]+/g, "[^/]+") + "$",
      );
      if (re.test(pathname)) {
        defs = MAP[pattern];
        break;
      }
    }
  }

  if (!defs) return [];

  return defs.map((d) => ({
    label: t(d.label),
    href: d.path,
  }));
}
