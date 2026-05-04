import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Input, Button } from "@yza/ui";
import { useAuthStore } from "@/stores/auth";
import { useConnectionStore } from "@/stores/connection";
import { api } from "@/lib/api";
import { isValidServerUrl, normalizeServerUrl } from "@/lib/server-url";
import { toast } from "sonner";
import type { User } from "@/types";

const featureIcons = ["\u25C8", "\u25C7", "\u2B21"];

export default function Login() {
  const { t } = useTranslation();
  const serverUrl = useConnectionStore((s) => s.serverUrl);
  const setServerUrl = useConnectionStore((s) => s.setServerUrl);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
  }>({});
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: typeof errors = {};
    const normalizedServerUrl = normalizeServerUrl(serverUrl);
    if (!isValidServerUrl(normalizedServerUrl)) {
      toast.error("Invalid server URL");
      return;
    }
    if (!username.trim()) newErrors.username = t("login.usernameRequired");
    if (!password) newErrors.password = t("login.passwordRequired");
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    if (normalizedServerUrl !== serverUrl) {
      setServerUrl(normalizedServerUrl);
    }
    setErrors({});
    setLoading(true);
    try {
      const { data } = await api.post<{ token: string; user: User }>(
        "/api/v1/auth/login",
        { username, password },
      );
      login(data.token, data.user);
      navigate("/dashboard", { replace: true });
    } catch {
      toast.error(t("login.failed"));
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stc-login">
      <div className="stc-login__brand">
        <svg className="stc-login__hex-grid" aria-hidden="true">
          <defs>
            <pattern id="hex" width="60" height="52" patternUnits="userSpaceOnUse" patternTransform="scale(1)">
              <path d="M30 0 L60 15 L60 37 L30 52 L0 37 L0 15 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hex)" />
        </svg>
        <div className="stc-login__logo">STC</div>
        <div className="stc-login__slogan">{t("login.subtitle")}</div>

        <div className="stc-login__stats">
          <div className="stc-login__stat">
            <span className="stc-login__stat-value">100%</span>
            <span className="stc-login__stat-label">{t("login.stat1")}</span>
          </div>
          <div className="stc-login__stat-divider" />
          <div className="stc-login__stat">
            <span className="stc-login__stat-value">10+</span>
            <span className="stc-login__stat-label">{t("login.stat2")}</span>
          </div>
          <div className="stc-login__stat-divider" />
          <div className="stc-login__stat">
            <span className="stc-login__stat-value">&infin;</span>
            <span className="stc-login__stat-label">{t("login.stat3")}</span>
          </div>
        </div>

        <div className="stc-login__features">
          {[1, 2, 3].map((i) => (
            <div className="stc-login__feature" key={i}>
              <div className="stc-login__feature-icon">
                {featureIcons[i - 1]}
              </div>
              <div className="stc-login__feature-title">
                {t(`login.feature${i}Title`)}
              </div>
              <div className="stc-login__feature-desc">
                {t(`login.feature${i}Desc`)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="stc-login__card-wrap">
        <div className={`stc-login__card${shaking ? " stc-shake" : ""}`}>
          <h1 className="stc-login__title">{t("login.title")}</h1>
          <p className="stc-login__desc">{t("login.desc")}</p>
          <form className="stc-login__form" onSubmit={handleSubmit}>
            <Input
              label="Server URL"
              placeholder="http://localhost:8080"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
            />
            <Input
              placeholder={t("login.username")}
              value={username}
              status={errors.username ? "error" : "default"}
              message={errors.username}
              onChange={(e) => {
                setUsername(e.target.value);
                setErrors((prev) => ({ ...prev, username: undefined }));
              }}
            />
            <Input
              type="password"
              placeholder={t("login.password")}
              value={password}
              status={errors.password ? "error" : "default"}
              message={errors.password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, password: undefined }));
              }}
            />
            <Button type="submit" disabled={loading}>
              {loading ? t("login.submitting") : t("login.submit")}
            </Button>
          </form>
        </div>
        <div className="stc-login__footer">
          &copy; {new Date().getFullYear()} Prowl Range
        </div>
      </div>
    </div>
  );
}
