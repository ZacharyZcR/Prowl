import { useId } from "react";

import type { ReactNode } from "react";

export interface DrawerProps {
  children?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  open: boolean;
  title: ReactNode;
}

export function Drawer({
  children,
  description,
  footer,
  onClose,
  open,
  title
}: DrawerProps) {
  const titleId = useId();

  if (!open) {
    return null;
  }

  return (
    <div className="yza-overlay" onClick={() => onClose?.()}>
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="yza-drawer"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="yza-surface-head">
          <div>
            <div className="yza-surface-title" id={titleId}>
              {title}
            </div>
            {description ? (
              <div className="yza-surface-description">{description}</div>
            ) : null}
          </div>
          <button
            aria-label="关闭侧边栏"
            className="yza-surface-close"
            onClick={() => onClose?.()}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="yza-surface-body">{children}</div>
        {footer ? <div className="yza-surface-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
