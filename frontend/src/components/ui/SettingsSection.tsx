import { type ReactNode } from "react";

export interface SettingsSectionProps {
  children: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function SettingsSection({ children, title, description, actions }: SettingsSectionProps) {
  return (
    <section className="flex flex-col gap-6 border-b border-[var(--stc-border)] py-6 first:pt-0 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-[var(--stc-text-primary)]">{title}</h3>
          {description && <p className="text-sm text-[var(--stc-text-secondary)]">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
