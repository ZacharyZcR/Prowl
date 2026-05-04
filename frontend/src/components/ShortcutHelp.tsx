import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { getPrimaryModifierLabel } from "@/lib/platform";

export function ShortcutHelp() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const mod = getPrimaryModifierLabel();

  useEffect(() => {
    function show() {
      setOpen(true);
    }
    window.addEventListener("stc:show-shortcuts", show);
    return () => window.removeEventListener("stc:show-shortcuts", show);
  }, []);

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

  if (!open) return null;

  const shortcuts = [
    { keys: `${mod}+K`, desc: t("shortcuts.commandPalette") },
    { keys: `${mod}+B`, desc: t("shortcuts.toggleSidebar") },
    { keys: `${mod}+H`, desc: t("shortcuts.home") },
    { keys: `${mod}+P`, desc: t("shortcuts.projects") },
    { keys: `${mod}+,`, desc: t("shortcuts.settings") },
    { keys: `${mod}+/`, desc: t("shortcuts.help") },
    { keys: "Escape", desc: t("shortcuts.close") },
  ];

  return createPortal(
    <div className="stc-modal-overlay" onClick={() => setOpen(false)}>
      <div className="stc-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="stc-modal-header">
          <h3 className="stc-modal-title">{t("shortcuts.title")}</h3>
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
        <div className="stc-shortcut-list">
          {shortcuts.map((s) => (
            <div key={s.keys} className="stc-shortcut-item">
              <kbd className="stc-kbd">{s.keys}</kbd>
              <span>{s.desc}</span>
            </div>
          ))}
        </div>
        <div className="stc-shortcut-footer">
          <span>{t("shortcuts.closeHint")}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
