import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  children?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  open: boolean;
  title: ReactNode;
}

export function Drawer({ children, description, footer, onClose, open, title }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 flex h-full w-full max-w-md flex-col bg-[var(--stc-surface-canvas)] shadow-xl",
          "animate-in slide-in-from-right",
        )}
      >
        <div className="flex items-start justify-between border-b border-[var(--stc-border)] px-6 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-[var(--stc-text-primary)]">{title}</h2>
            {description && <p className="text-sm text-[var(--stc-text-secondary)]">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-[var(--stc-text-tertiary)] hover:text-[var(--stc-text-primary)] hover:bg-[var(--stc-surface-subtle)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--stc-border)] px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
