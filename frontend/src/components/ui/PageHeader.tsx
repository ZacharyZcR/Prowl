import { type ReactNode } from "react";

export interface PageHeaderProps {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
}

export function PageHeader({ actions, description, eyebrow, meta, title }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        {eyebrow && <span className="text-xs font-medium uppercase tracking-wider text-[var(--stc-text-tertiary)]">{eyebrow}</span>}
        <h1 className="text-2xl font-bold text-[var(--stc-text-primary)]">{title}</h1>
        {description && <p className="text-sm text-[var(--stc-text-secondary)]">{description}</p>}
        {meta && <div className="mt-1 text-sm text-[var(--stc-text-tertiary)]">{meta}</div>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
