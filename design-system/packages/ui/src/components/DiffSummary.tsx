import type { ReactNode } from "react";

export interface DiffSummaryItem {
  detail?: ReactNode;
  label: ReactNode;
  tone?: "info" | "success" | "warning" | "danger";
  value: ReactNode;
}

export interface DiffSummaryProps {
  items: DiffSummaryItem[];
  title?: ReactNode;
}

export function DiffSummary({
  items,
  title
}: DiffSummaryProps) {
  return (
    <section className="yza-diff-summary">
      {title ? <h3 className="yza-diff-summary__title">{title}</h3> : null}
      <div className="yza-diff-summary__list">
        {items.map((item, index) => (
          <article className="yza-diff-summary__item" key={index}>
            <div className="yza-diff-summary__header">
              <div className="yza-diff-summary__label">{item.label}</div>
              <div
                className={[
                  "yza-diff-summary__value",
                  item.tone ? `yza-diff-summary__value--${item.tone}` : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {item.value}
              </div>
            </div>
            {item.detail ? <div className="yza-diff-summary__detail">{item.detail}</div> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
