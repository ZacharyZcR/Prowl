import type { ReactNode } from "react";

export interface FilterChip {
  id: string;
  label: ReactNode;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
}

export interface FilterBarProps {
  actions?: ReactNode;
  chips?: FilterChip[];
  controls?: ReactNode;
  title?: ReactNode;
}

export function FilterBar({
  actions,
  chips = [],
  controls,
  title = "筛选条件"
}: FilterBarProps) {
  return (
    <section className="yza-filter-bar">
      <div className="yza-filter-bar__header">
        <div className="yza-filter-bar__title">{title}</div>
        {actions ? <div className="yza-filter-bar__actions">{actions}</div> : null}
      </div>

      {controls ? <div className="yza-filter-bar__controls">{controls}</div> : null}

      {chips.length > 0 ? (
        <div className="yza-filter-bar__chips">
          {chips.map((chip) => (
            <span
              className={["yza-filter-chip", `yza-filter-chip--${chip.tone ?? "neutral"}`].join(" ")}
              key={chip.id}
            >
              {chip.label}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
