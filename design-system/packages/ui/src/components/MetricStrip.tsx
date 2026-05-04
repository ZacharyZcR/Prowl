import type { ReactNode } from "react";

export interface MetricStripItem {
  label: ReactNode;
  meta?: ReactNode;
  tone?: "default" | "info" | "success" | "warning" | "danger";
  value: ReactNode;
}

export interface MetricStripProps {
  items: MetricStripItem[];
}

export function MetricStrip({ items }: MetricStripProps) {
  return (
    <section className="yza-metric-strip">
      {items.map((item, index) => (
        <article
          className={[
            "yza-metric-strip__item",
            item.tone && item.tone !== "default" ? `yza-metric-strip__item--${item.tone}` : ""
          ]
            .filter(Boolean)
            .join(" ")}
          key={index}
        >
          <div className="yza-metric-strip__label">{item.label}</div>
          <div className="yza-metric-strip__value">{item.value}</div>
          {item.meta ? <div className="yza-metric-strip__meta">{item.meta}</div> : null}
        </article>
      ))}
    </section>
  );
}
