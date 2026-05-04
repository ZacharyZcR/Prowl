import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-muted-foreground">
        {t("common.pageNotFound", "Page Not Found")}
      </p>
      <Button asChild variant="outline">
        <Link to="/dashboard">{t("common.backToDashboard", "Back to Dashboard")}</Link>
      </Button>
    </div>
  );
}
