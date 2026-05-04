import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { usePermission } from "@/hooks/usePermission";
import { hasPrimaryModifier } from "@/lib/platform";
import { useAppStore } from "@/stores/app";
import { useAuthStore } from "@/stores/auth";

interface PaletteItem {
  id: string;
  label: string;
  group: string;
  onSelect: () => void;
}

export function CommandPaletteProvider() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { can } = usePermission();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isInput =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target?.isContentEditable;

      if (isInput) {
        return;
      }

      if (hasPrimaryModifier(e) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    function toggle() {
      setOpen((prev) => !prev);
    }

    window.addEventListener("keydown", handler);
    window.addEventListener("stc:toggle-command-palette", toggle);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("stc:toggle-command-palette", toggle);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const go = useCallback(
    (path: string) => {
      navigate(path);
      close();
    },
    [navigate, close],
  );

  const items = useMemo<PaletteItem[]>(() => {
    const nav: PaletteItem[] = [
      { id: "dashboard", label: t("nav.dashboard"), group: t("commandPalette.navigation"), onSelect: () => go("/dashboard") },
      can("project:read") ? { id: "projects", label: t("nav.projects"), group: t("commandPalette.navigation"), onSelect: () => go("/projects") } : null,
      can("user:read") ? { id: "users", label: t("nav.users"), group: t("commandPalette.navigation"), onSelect: () => go("/users") } : null,
      can("role:read") ? { id: "roles", label: t("nav.roles"), group: t("commandPalette.navigation"), onSelect: () => go("/roles") } : null,
      can("role:read") ? { id: "permissions", label: t("nav.permissions"), group: t("commandPalette.navigation"), onSelect: () => go("/permissions") } : null,
      can("activity:read") ? { id: "activities", label: t("nav.activities"), group: t("commandPalette.navigation"), onSelect: () => go("/activities") } : null,
      can("activity:read") ? { id: "login-logs", label: t("nav.loginLogs"), group: t("commandPalette.navigation"), onSelect: () => go("/login-logs") } : null,
      can("error_log:read") ? { id: "error-logs", label: t("nav.errorLogs"), group: t("commandPalette.navigation"), onSelect: () => go("/error-logs") } : null,
      can("upload:create") ? { id: "files", label: t("nav.files"), group: t("commandPalette.navigation"), onSelect: () => go("/files") } : null,
      { id: "api-keys", label: t("nav.apiKeys"), group: t("commandPalette.navigation"), onSelect: () => go("/api-keys") },
      can("cron:read") ? { id: "cron-jobs", label: t("nav.cronJobs"), group: t("commandPalette.navigation"), onSelect: () => go("/cron-jobs") } : null,
      can("announcement:read") ? { id: "announcements", label: t("nav.announcements"), group: t("commandPalette.navigation"), onSelect: () => go("/announcements") } : null,
      can("dict:read") ? { id: "dictionaries", label: t("nav.dictionaries"), group: t("commandPalette.navigation"), onSelect: () => go("/dictionaries") } : null,
      { id: "settings", label: t("nav.settings"), group: t("commandPalette.navigation"), onSelect: () => go("/settings") },
      can("system:settings") ? { id: "system-settings", label: t("nav.systemSettings"), group: t("commandPalette.navigation"), onSelect: () => go("/system-settings") } : null,
      can("system:settings") ? { id: "health", label: t("nav.healthMonitor"), group: t("commandPalette.navigation"), onSelect: () => go("/health-monitor") } : null,
      can("system:settings") ? { id: "system-logs", label: t("nav.systemLogs"), group: t("commandPalette.navigation"), onSelect: () => go("/system-logs") } : null,
      can("system:settings") ? { id: "webhooks", label: t("nav.webhooks"), group: t("commandPalette.navigation"), onSelect: () => go("/webhooks") } : null,
      can("system:settings") ? { id: "task-queue", label: t("nav.taskQueue"), group: t("commandPalette.navigation"), onSelect: () => go("/task-queue") } : null,
    ].filter(Boolean) as PaletteItem[];

    const actions: PaletteItem[] = [
      {
        id: "theme-toggle",
        label: t("commandPalette.toggleTheme", {
          theme: theme === "light" ? t("theme.dark") : theme === "dark" ? t("theme.system") : t("theme.light"),
        }),
        group: t("commandPalette.actions"),
        onSelect: () => {
          const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
          setTheme(next);
          close();
        },
      },
      {
        id: "language-toggle",
        label: t("commandPalette.switchLanguage", { language: lang === "zh" ? "English" : "\u4E2D\u6587" }),
        group: t("commandPalette.actions"),
        onSelect: () => {
          setLang(lang === "zh" ? "en" : "zh");
          close();
        },
      },
      {
        id: "shortcuts",
        label: t("shortcuts.title"),
        group: t("commandPalette.actions"),
        onSelect: () => {
          window.dispatchEvent(new CustomEvent("stc:show-shortcuts"));
          close();
        },
      },
      {
        id: "logout",
        label: t("common.logout"),
        group: t("commandPalette.actions"),
        onSelect: () => {
          logout();
          navigate("/login", { replace: true });
          close();
        },
      },
    ];

    return [...nav, ...actions];
  }, [t, can, go, close, theme, setTheme, lang, setLang, logout, navigate]);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((item) =>
      item.label.toLowerCase().includes(q) || item.group.toLowerCase().includes(q),
    );
  }, [items, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (filtered.length === 0) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      filtered[activeIndex]?.onSelect();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  if (!open) return null;

  // group filtered items
  const groups = new Map<string, PaletteItem[]>();
  for (const item of filtered) {
    const list = groups.get(item.group) ?? [];
    list.push(item);
    groups.set(item.group, list);
  }

  let globalIdx = 0;

  return createPortal(
    <div className="stc-modal-overlay" onClick={close}>
      <div
        className="stc-modal-card stc-command-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="yza-command__search">
          <input
            ref={inputRef}
            className="yza-command__input"
            placeholder={t("commandPalette.placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="yza-command__hint">ESC</span>
        </div>
        <div className="yza-command__groups stc-command-groups">
          {Array.from(groups.entries()).map(([groupLabel, groupItems]) => (
            <section className="yza-command__group" key={groupLabel}>
              <div className="yza-command__group-title">{groupLabel}</div>
              <div className="yza-command__list">
                {groupItems.map((item) => {
                  const idx = globalIdx++;
                  return (
                    <button
                      key={item.id}
                      className={`yza-command__item${idx === activeIndex ? " yza-command__item--active" : ""}`}
                      type="button"
                      onClick={item.onSelect}
                      onMouseEnter={() => setActiveIndex(idx)}
                    >
                      <span className="yza-command__item-main">
                        <span>{item.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {filtered.length === 0 && (
            <div className="stc-command-empty">
              <div className="stc-command-empty__title">{t("commandPalette.emptyTitle")}</div>
              <div className="stc-command-empty__desc">{t("commandPalette.emptyDescription")}</div>
            </div>
          )}
        </div>
        <div className="stc-command-footer">
          <span>{t("commandPalette.resultCount", { count: filtered.length })}</span>
          <span>{t("commandPalette.navigateHint")}</span>
          <span>{t("commandPalette.enterHint")}</span>
          <span>{t("commandPalette.closeHint")}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
