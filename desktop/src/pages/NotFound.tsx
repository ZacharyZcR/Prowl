import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@yza/ui";

export default function NotFound() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div
      className="stc-page-animate"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: "var(--yza-space-4)",
      }}
    >
      <h1
        style={{
          fontSize: "4rem",
          fontWeight: 700,
          color: "var(--yza-color-text-tertiary)",
          margin: 0,
        }}
      >
        404
      </h1>
      <p style={{ color: "var(--yza-color-text-secondary)", margin: 0 }}>
        {t("common.notFound", "Page not found")}
      </p>
      <Button tone="primary" onClick={() => navigate("/dashboard")}>
        {t("common.backToDashboard", "Back to Dashboard")}
      </Button>
    </div>
  );
}
