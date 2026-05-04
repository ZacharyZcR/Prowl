import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button, Tag } from "@yza/ui";
import { Trophy, Users, User, LogOut, Moon, Sun, Globe } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { useSettingsStore } from "@/stores/settings";
import { useTranslation } from "react-i18next";

export default function PortalLayout() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { theme, toggleTheme, lang, toggleLang } = useSettingsStore();
  const navigate = useNavigate();
  const location = useLocation();

  const NAV = [
    { path: "/", label: t("nav.competitions"), icon: <Trophy size={16} />, exact: true },
    { path: "/team", label: t("nav.team"), icon: <Users size={16} /> },
    { path: "/profile", label: t("nav.profile"), icon: <User size={16} /> },
  ];

  function isActive(path: string, exact?: boolean) {
    return exact ? location.pathname === path : location.pathname.startsWith(path);
  }

  return (
    <div className="portal-shell">
      <header className="portal-topbar">
        <div className="portal-topbar__left">
          <Link to="/" className="portal-topbar__brand">
            <Trophy size={18} />
            <span>{t("nav.brand")}</span>
          </Link>
          <nav className="portal-topbar__nav">
            {NAV.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`portal-topbar__link${isActive(item.path, item.exact) ? " portal-topbar__link--active" : ""}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="portal-topbar__right">
          <button
            type="button" onClick={toggleLang} className="topbar-icon-btn"
            title={t("lang.toggle")}
          >
            <Globe size={15} />
            <span style={{ fontSize: 11 }}>{lang === "zh" ? "EN" : "中"}</span>
          </button>
          <button
            type="button" onClick={toggleTheme} className="topbar-icon-btn"
            title={t("theme.toggle")}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <Tag tone="neutral">{user?.username}</Tag>
          <Button size="sm" tone="outline" onClick={() => { logout(); navigate("/login"); }}>
            <LogOut size={14} />
          </Button>
        </div>
      </header>
      <div className="portal-content">
        <Outlet />
      </div>
    </div>
  );
}
