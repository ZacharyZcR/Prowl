import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Input, Alert } from "@yza/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useTranslation } from "react-i18next";

export default function Login() {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/v1/auth/login", { username, password });
      const data = res.data as { token: string; user: { id: number; username: string; nickname: string; email: string } };
      setAuth(data.token, data.user);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <form onSubmit={handleSubmit} className="auth-box">
        <h1>Prowl Range</h1>
        <div className="subtitle">综合安全靶场平台</div>
        {error && <Alert tone="danger" heading={error} style={{ marginBottom: 16 }} />}
        <div className="yza-doc-stack">
          <Input label={t("auth.username")} value={username} onChange={(e) => setUsername(e.target.value)} />
          <div className="yza-field">
            <span className="yza-field__label">{t("auth.password")}</span>
            <div className="yza-input-shell">
              <input className="yza-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <Button tone="primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? t("common.loading") : t("auth.login")}
          </Button>
        </div>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "var(--yza-text-secondary)" }}>
          {t("auth.noAccount")}<Link to="/register">{t("auth.goRegister")}</Link>
        </div>
      </form>
    </div>
  );
}
