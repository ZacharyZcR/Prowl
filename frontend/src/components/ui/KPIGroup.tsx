import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface KPIItem {
  label: ReactNode;
  meta?: ReactNode;
  tone?: "default" | "info" | "success" | "warning" | "danger";
  trend?: ReactNode;
  value: ReactNode;
}

export interface KPIGroupProps {
  columns?: 2 | 3 | 4;
  items: KPIItem[];
}

const toneBorder: Record<string, string> = {
  default: "border-[var(--stc-border)]",
  info: "border-[var(--stc-brand-600)]",
  success: "border-[var(--stc-success-600)]",
  warning: "border-[var(--stc-warning-500)]",
  danger: "border-[var(--stc-danger-600)]",
};

const colClass: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

export function KPIGroup({ columns = 4, items }: KPIGroupProps) {
  return (
    <div className={cn("grid gap-4", colClass[columns])}>
      {items.map((item, i) => (
        <div
          key={i}
          className={cn(
            "rounded-lg border-l-4 bg-[var(--stc-surface-canvas)] border border-[var(--stc-border)] p-4",
            toneBorder[item.tone ?? "default"],
          )}
        >
          <p className="text-xs font-medium text-[var(--stc-text-tertiary)] uppercase tracking-wider">{item.label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--stc-text-primary)]">{item.value}</span>
            {item.trend && <span className="text-sm">{item.trend}</span>}
          </div>
          {item.meta && <p className="mt-1 text-xs text-[var(--stc-text-tertiary)]">{item.meta}</p>}
        </div>
      ))}
    </div>
  );
}
