import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Skeleton, Tag } from "@yza/ui";
import { Info } from "lucide-react";
import { api } from "@/lib/api";

export function VersionInfo() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["version-info"],
    queryFn: () => api.get("/api/v1/health").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        className="stc-icon-btn"
        onClick={() => setOpen(true)}
        title={t("version.title")}
        type="button"
        aria-label={t("version.title")}
      >
        <Info size={16} />
      </button>

      {open &&
        createPortal(
          <div className="stc-modal-overlay" onClick={() => setOpen(false)}>
            <div className="stc-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="stc-modal-header">
                <h3 className="stc-modal-title">{t("version.title")}</h3>
                <button
                  className="stc-icon-btn"
                  onClick={() => setOpen(false)}
                  type="button"
                  aria-label={t("common.close")}
                  title={t("common.close")}
                >
                  &times;
                </button>
              </div>
              <div className="stc-version-info">
                <div className="stc-version-info__hero">
                  <span className="stc-version-info__name">Prowl</span>
                  <Tag tone="info">{data?.version ?? "dev"}</Tag>
                </div>
                {isLoading || (isFetching && !data) ? (
                  <div className="yza-doc-stack">
                    <Skeleton variant="rect" height={18} />
                    <Skeleton variant="rect" height={18} />
                  </div>
                ) : error ? (
                  <div className="yza-doc-stack">
                    <Alert
                      heading={t("version.loadFailed")}
                      description={error instanceof Error ? error.message : t("common.loadFailed")}
                      tone="danger"
                    />
                    <div>
                      <Button size="sm" tone="outline" onClick={() => void refetch()}>
                        {t("common.retry")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="stc-version-info__details">
                    <div className="stc-version-info__row">
                      <span className="stc-version-info__label">{t("version.buildTime")}</span>
                      <span>{data?.build_time ?? "--"}</span>
                    </div>
                    <div className="stc-version-info__row">
                      <span className="stc-version-info__label">{t("version.commit")}</span>
                      <code>{data?.git_commit ?? "--"}</code>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
