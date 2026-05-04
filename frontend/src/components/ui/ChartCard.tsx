import { type ReactNode } from "react";

export interface ChartCardProps {
  children: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
}

export function ChartCard({ children, title, subtitle }: ChartCardProps) {
  return (
    <div className="rounded-lg border border-[var(--stc-border)] bg-[var(--stc-surface-canvas)] p-5">
      <div className="mb-4 flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold text-[var(--stc-text-primary)]">{title}</h3>
        {subtitle && <p className="text-xs text-[var(--stc-text-tertiary)]">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
