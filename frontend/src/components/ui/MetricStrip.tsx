import { type ReactNode } from "react";

export interface MetricStripProps {
  items: { label: ReactNode; value: ReactNode; meta?: ReactNode; tone?: string }[];
}

export function MetricStrip({ items }: MetricStripProps) {
  return (
    <div className="flex items-center divide-x divide-[var(--stc-border)]">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 px-6 first:pl-0 last:pr-0">
          <span className="text-lg font-bold text-[var(--stc-text-primary)]">{item.value}</span>
          <span className="text-xs text-[var(--stc-text-tertiary)]">{item.label}</span>
          {item.meta && <span className="text-xs text-[var(--stc-text-tertiary)]">{item.meta}</span>}
        </div>
      ))}
    </div>
  );
}
