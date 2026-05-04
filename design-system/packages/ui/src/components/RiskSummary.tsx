import type { ReactNode } from "react";

export interface RiskSummaryItem {
  label: ReactNode;
  meta?: ReactNode;
  value: ReactNode;
}

export interface RiskSummaryProps {
  items: RiskSummaryItem[];
  summary?: ReactNode;
  title: ReactNode;
  tone?: "info" | "success" | "warning" | "danger";
}

export function RiskSummary({
  items,
  summary,
  title,
  tone = "warning"
}: RiskSummaryProps) {
  return (
    <section className={`yza-risk-summary yza-risk-summary--${tone}`}>
      <div className="yza-risk-summary__header">
        <h3 className="yza-risk-summary__title">{title}</h3>
        {summary ? <div className="yza-risk-summary__summary">{summary}</div> : null}
      </div>
      <div className="yza-risk-summary__grid">
        {items.map((item, index) => (
          <article className="yza-risk-summary__item" key={index}>
            <div className="yza-risk-summary__label">{item.label}</div>
            <div className="yza-risk-summary__value">{item.value}</div>
            {item.meta ? <div className="yza-risk-summary__meta">{item.meta}</div> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
