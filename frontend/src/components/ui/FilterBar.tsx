import { type ReactNode } from "react";
import type { TagProps } from "./Tag";

export interface FilterChip {
  id: string;
  label: ReactNode;
  tone?: TagProps["tone"];
}

export interface FilterBarProps {
  actions?: ReactNode;
  chips?: FilterChip[];
  controls?: ReactNode;
  title?: ReactNode;
}

const chipTone: Record<string, string> = {
  neutral: "bg-[var(--stc-neutral-200)] text-[var(--stc-text-secondary)]",
  info: "bg-[var(--stc-brand-600)]/10 text-[var(--stc-brand-600)]",
  success: "bg-[var(--stc-success-600)]/10 text-[var(--stc-success-600)]",
  warning: "bg-[var(--stc-warning-500)]/10 text-[var(--stc-warning-500)]",
  danger: "bg-[var(--stc-danger-600)]/10 text-[var(--stc-danger-600)]",
};

export function FilterBar({ actions, chips, controls, title }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {title && <h3 className="text-sm font-medium text-[var(--stc-text-primary)]">{title}</h3>}
        <div className="flex items-center gap-2">
          {controls}
          {actions}
        </div>
      </div>
      {chips && chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip.id}
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${chipTone[chip.tone ?? "neutral"]}`}
            >
              {chip.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
