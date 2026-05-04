import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/auth";
import { toast } from "sonner";
import type { User } from "@/types";

export default function OAuthCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    const userRaw = params.get("user");
    const error = params.get("error");

    if (error) {
      toast.error(error);
      navigate("/login", { replace: true });
      return;
    }

    if (token && userRaw) {
      try {
        const user: User = JSON.parse(userRaw);
        login(token, user);
        navigate("/dashboard", { replace: true });
      } catch {
        toast.error(t("login.failed"));
        navigate("/login", { replace: true });
      }
    } else {
      navigate("/login", { replace: true });
    }
  }, [params, login, navigate, t]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  );
}
