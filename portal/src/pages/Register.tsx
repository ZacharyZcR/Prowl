import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Input, Alert } from "@yza/ui";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";

export default function Register() {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (username.length < 3) {
      setError(t("auth.usernameTooShort"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.passwordTooShort"));
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/v1/portal/auth/register", {
        username,
        password,
        ...(email ? { email } : {}),
      });
      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.registerFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <form onSubmit={handleSubmit} className="auth-box">
        <h1>{t("auth.registerTitle")}</h1>
        <div className="subtitle">{t("auth.registerSubtitle")}</div>
        {error && <Alert tone="danger" heading={error} style={{ marginBottom: 16 }} />}
        <div className="yza-doc-stack">
          <Input label={t("auth.username")} value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input label={t("auth.email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="yza-field">
            <span className="yza-field__label">{t("auth.password")}</span>
            <div className="yza-input-shell">
              <input className="yza-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <Button tone="primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? t("common.loading") : t("auth.register")}
          </Button>
        </div>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "var(--yza-text-secondary)" }}>
          {t("auth.hasAccount")}<Link to="/login">{t("auth.goLogin")}</Link>
        </div>
      </form>
    </div>
  );
}
