import { type ReactNode } from "react";

export interface DetailHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: { label: string; value: ReactNode }[];
  status?: ReactNode;
}

export function DetailHeader({ title, subtitle, description, actions, meta, status }: DetailHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--stc-border)] pb-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--stc-text-primary)]">{title}</h1>
          {status && <span>{status}</span>}
        </div>
        {subtitle && <p className="text-sm text-[var(--stc-text-secondary)]">{subtitle}</p>}
        {description && <p className="text-sm text-[var(--stc-text-secondary)]">{description}</p>}
        {meta && meta.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--stc-text-tertiary)]">
            {meta.map((m, i) => (
              <span key={i}>
                <span className="font-medium">{m.label}:</span> {m.value}
              </span>
            ))}
          </div>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
