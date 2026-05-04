import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@yza/ui";

export default function NotFound() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="stc-page-animate stc-not-found">
      <h1 className="stc-not-found__code">404</h1>
      <p className="stc-not-found__desc">{t("common.notFound")}</p>
      <Button tone="primary" onClick={() => navigate("/dashboard")}>{t("common.backToDashboard")}</Button>
    </div>
  );
}
