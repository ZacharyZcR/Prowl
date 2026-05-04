import { createPortal } from "react-dom";
import { useEffect, useRef, useCallback, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Breadcrumb, DashboardShell, Sidebar, TopNav, Tag } from "@yza/ui";
import { useTranslation } from "react-i18next";
import { createTimeline } from "animejs";
import {
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { useAppStore } from "@/stores/app";
import { useTransitionStore } from "@/stores/transition";
import { usePermission } from "@/hooks/usePermission";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { resolveBreadcrumbs } from "@/lib/breadcrumbs";
import { NotificationCenter } from "@/components/NotificationCenter";
import { OnlineIndicator } from "@/components/OnlineIndicator";
import { AICopilot } from "@/components/AICopilot";
import { ShortcutHelp } from "@/components/ShortcutHelp";
import { CommandPaletteProvider } from "@/components/CommandPaletteProvider";
import { VersionInfo } from "@/components/VersionInfo";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { ProgressPanel } from "@/components/ProgressPanel";
import { AmbientScene } from "@/components/AmbientScene";
import { NumberAnimator } from "@/components/NumberAnimator";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useReducedMotion } from "@/hooks/useMotionPreferences";
import { NAV_ITEMS, ThemeToggle, LangToggle, CommandPaletteTrigger, buildSidebarSections } from "@/components/layout/nav";

const MOBILE_BREAKPOINT = "(max-width: 960px)";

export function Layout() {
  useKeyboardShortcuts();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const { can } = usePermission();
  const phase = useTransitionStore((s) => s.phase);
  const setPhase = useTransitionStore((s) => s.setPhase);
  const reducedMotion = useReducedMotion();
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const isSidebarCollapsed = !isMobile && sidebarCollapsed;

  const closeMobileNav = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  // Sidebar sliding indicator
  const updateIndicator = useCallback(() => {
    const wrap = sidebarRef.current;
    const indicator = indicatorRef.current;
    if (!wrap || !indicator) return;
    const active = wrap.querySelector<HTMLElement>('.yza-sidebar__item[data-active="true"]');
    if (!active) {
      indicator.style.opacity = "0";
      return;
    }
    const wrapRect = wrap.getBoundingClientRect();
    const itemRect = active.getBoundingClientRect();
    indicator.style.opacity = "1";
    indicator.style.top = `${itemRect.top - wrapRect.top}px`;
    indicator.style.height = `${itemRect.height}px`;
  }, []);

  useEffect(() => {
    updateIndicator();
    const id = setTimeout(updateIndicator, 400);
    return () => clearTimeout(id);
  }, [location.pathname, isSidebarCollapsed, mobileNavOpen, updateIndicator]);

  useEffect(() => {
    if (!isMobile) {
      setMobileNavOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileNavOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  // Dashboard entrance animation after login transition
  useEffect(() => {
    if (phase !== "login-exit") return;
    if (!shellRef.current) return;
    if (reducedMotion) {
      setPhase("idle");
      return;
    }

    setPhase("dashboard-enter");

    const el = shellRef.current;
    const tl = createTimeline({
      defaults: { ease: "easeOutCubic" },
      onComplete: () => setPhase("idle"),
    });

    const sidebar = el.querySelector(".yza-sidebar");
    if (sidebar) {
      tl.add(sidebar, {
        translateX: [-60, 0],
        opacity: [0, 1],
        duration: 700,
      }, 200);
    }

    const topnav = el.querySelector(".yza-topnav");
    if (topnav) {
      tl.add(topnav, {
        translateY: [-30, 0],
        opacity: [0, 1],
        duration: 500,
      }, 300);
    }

    const content = el.querySelector(".stc-route-transition");
    if (content) {
      tl.add(content, {
        opacity: [0, 1],
        scale: [0.96, 1],
        translateY: [20, 0],
        duration: 700,
      }, 400);
    }

    return () => { tl.pause(); };
  }, [phase, reducedMotion, setPhase]);

  const visibleItems = NAV_ITEMS.filter((item) => !item.permission || can(item.permission));
  const sections = buildSidebarSections(visibleItems, location.pathname, t);
  const avatarInitial = (user?.username ?? "?")[0].toUpperCase();
  const crumbs = resolveBreadcrumbs(location.pathname, t);

  function handleSidebarClick(e: React.MouseEvent) {
    const btn = (e.target as HTMLElement).closest("button.yza-sidebar__item");
    if (!btn) return;
    const label = btn.querySelector<HTMLElement>("[data-path]");
    const path = label?.dataset.path;
    if (path) {
      navigate(path);
      if (isMobile) {
        closeMobileNav();
      }
    }
  }

  const sidebarContent = (
    <div
      onClick={handleSidebarClick}
      role="navigation"
      aria-label={t("nav.sidebar")}
      className="stc-sidebar-wrap"
      ref={sidebarRef}
    >
      <div className="stc-sidebar-indicator" ref={indicatorRef} />
      <Sidebar
        brand={<span className="stc-brand">Prowl <span className="stc-brand__sub">Range</span></span>}
        sections={sections}
      />
      {!isMobile && (
        <div className="stc-sidebar-footer">
          <button
            className="stc-sidebar-toggle"
            onClick={(e) => { e.stopPropagation(); toggleSidebar(); }}
            type="button"
            title={isSidebarCollapsed ? t("common.expandSidebar") : t("common.collapseSidebar")}
            aria-label={isSidebarCollapsed ? t("common.expandSidebar") : t("common.collapseSidebar")}
          >
            {isSidebarCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div data-sidebar-collapsed={isSidebarCollapsed} data-shell-mode={isMobile ? "mobile" : "desktop"} ref={shellRef}>
      <AmbientScene />
      <DashboardShell
        header={
          <TopNav
            brand={
              <div className="stc-header-breadcrumb" onClick={(e) => {
                const link = (e.target as HTMLElement).closest<HTMLAnchorElement>("a.yza-breadcrumb__link");
                if (link?.href) { e.preventDefault(); navigate(new URL(link.href).pathname); }
              }} role="presentation">
                {crumbs.length > 0 ? <Breadcrumb items={crumbs} /> : <span className="stc-brand">Prowl</span>}
              </div>
            }
            items={[]}
            actions={
              <div className="stc-topnav-actions">
                {isMobile && (
                  <button
                    className="stc-icon-btn stc-mobile-nav-trigger"
                    onClick={() => setMobileNavOpen((open) => !open)}
                    type="button"
                    aria-label={t("nav.sidebar")}
                    aria-expanded={mobileNavOpen}
                    title={t("nav.sidebar")}
                  >
                    <Menu size={18} />
                  </button>
                )}
                <CommandPaletteTrigger />
                <OnlineIndicator />
                <NotificationCenter />
                <ThemeToggle />
                <LangToggle />
                <VersionInfo />
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
        sidebar={isMobile ? undefined : sidebarContent}
      >
        <AnnouncementBanner />
        <div key={location.pathname} className="stc-route-transition">
          <Outlet />
        </div>
      </DashboardShell>
      {isMobile && mobileNavOpen && createPortal(
        <div className="stc-mobile-sidebar-layer" onClick={closeMobileNav}>
          <div
            className="stc-mobile-sidebar-panel"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.sidebar")}
          >
            <div className="stc-mobile-sidebar-toolbar">
              <span className="stc-mobile-sidebar-title">{t("nav.sidebar")}</span>
              <button
                className="stc-icon-btn stc-mobile-sidebar-close"
                onClick={closeMobileNav}
                type="button"
                aria-label={t("common.close")}
                title={t("common.close")}
              >
                <X size={18} />
              </button>
            </div>
            <div className="stc-mobile-sidebar-content">{sidebarContent}</div>
          </div>
        </div>,
        document.body,
      )}
      <ShortcutHelp />
      <CommandPaletteProvider />
      <AICopilot />
      <NumberAnimator />
      <ProgressPanel />
    </div>
  );
}
