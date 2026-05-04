import type { ReactNode } from "react";

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

export function KPIGroup({
  columns = 4,
  items
}: KPIGroupProps) {
  return (
    <section className={`yza-kpi-group yza-kpi-group--cols-${columns}`}>
      {items.map((item, index) => (
        <article
          className={[
            "yza-kpi-card",
            item.tone && item.tone !== "default" ? `yza-kpi-card--${item.tone}` : ""
          ]
            .filter(Boolean)
            .join(" ")}
          key={index}
        >
          <div className="yza-kpi-card__label">{item.label}</div>
          <div className="yza-kpi-card__value">{item.value}</div>
          {item.trend ? <div className="yza-kpi-card__trend">{item.trend}</div> : null}
          {item.meta ? <div className="yza-kpi-card__meta">{item.meta}</div> : null}
        </article>
      ))}
    </section>
  );
}
