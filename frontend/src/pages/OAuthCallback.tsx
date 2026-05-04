import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import type { User } from "@/types";

export default function OAuthCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const error = params.get("error");

    if (token) {
      api
        .get<User>("/api/v1/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((r) => {
          login(token, r.data);
          navigate("/dashboard", { replace: true });
        })
        .catch(() => navigate("/login?error=oauth_failed", { replace: true }));
    } else {
      navigate(`/login?error=${encodeURIComponent(error || "oauth_failed")}`, { replace: true });
    }
  }, [login, navigate]);

  return (
    <div className="stc-login">
      <p>{t("login.redirecting")}</p>
    </div>
  );
}
