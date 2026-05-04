import type { ReactNode } from "react";

export interface CompareBlockProps {
  description?: ReactNode;
  diff?: ReactNode;
  leftLabel: ReactNode;
  leftMeta?: ReactNode;
  leftValue: ReactNode;
  rightLabel: ReactNode;
  rightMeta?: ReactNode;
  rightValue: ReactNode;
  title: ReactNode;
  tone?: "default" | "info" | "success" | "warning" | "danger";
}

export function CompareBlock({
  description,
  diff,
  leftLabel,
  leftMeta,
  leftValue,
  rightLabel,
  rightMeta,
  rightValue,
  title,
  tone = "default"
}: CompareBlockProps) {
  return (
    <section className={`yza-compare-block yza-compare-block--${tone}`}>
      <header className="yza-compare-block__header">
        <div>
          <h3 className="yza-compare-block__title">{title}</h3>
          {description ? <div className="yza-compare-block__description">{description}</div> : null}
        </div>
        {diff ? <div className="yza-compare-block__diff">{diff}</div> : null}
      </header>
      <div className="yza-compare-block__body">
        <article className="yza-compare-block__side">
          <div className="yza-compare-block__label">{leftLabel}</div>
          <div className="yza-compare-block__value">{leftValue}</div>
          {leftMeta ? <div className="yza-compare-block__meta">{leftMeta}</div> : null}
        </article>
        <article className="yza-compare-block__side">
          <div className="yza-compare-block__label">{rightLabel}</div>
          <div className="yza-compare-block__value">{rightValue}</div>
          {rightMeta ? <div className="yza-compare-block__meta">{rightMeta}</div> : null}
        </article>
      </div>
    </section>
  );
}
