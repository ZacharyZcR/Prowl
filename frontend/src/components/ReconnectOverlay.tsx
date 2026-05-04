import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

interface Props {
  visible: boolean;
  attempt: number;
}

export function ReconnectOverlay({ visible, attempt }: Props) {
  const { t } = useTranslation();
  if (!visible) return null;

  return createPortal(
    <div className="stc-reconnect-overlay">
      <div className="stc-reconnect-card">
        <div className="stc-reconnect-spinner" />
        <p className="stc-reconnect-title">{t("reconnect.title")}</p>
        <p className="stc-reconnect-detail">
          {t("reconnect.attempt", { current: attempt })}
        </p>
        <div className="stc-reconnect-bar">
          <div className="stc-reconnect-bar__fill" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
