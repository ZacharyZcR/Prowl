import { type ReactNode } from "react";

export interface PageSectionProps {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageSection({ children, title, description, actions }: PageSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            {title && <h2 className="text-lg font-semibold text-[var(--stc-text-primary)]">{title}</h2>}
            {description && <p className="text-sm text-[var(--stc-text-secondary)]">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
