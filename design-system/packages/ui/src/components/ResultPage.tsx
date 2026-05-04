import type { ReactNode } from "react";

export interface ResultPageProps {
  actions?: ReactNode;
  description: ReactNode;
  details?: ReactNode;
  eyebrow?: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
  tone?: "default" | "info" | "success" | "warning" | "danger";
}

export function ResultPage({
  actions,
  description,
  details,
  eyebrow,
  icon,
  title,
  tone = "default"
}: ResultPageProps) {
  return (
    <section className={`yza-result-page yza-result-page--${tone}`}>
      <div className="yza-result-page__icon" aria-hidden="true">
        {icon ?? "✓"}
      </div>
      {eyebrow ? <div className="yza-result-page__eyebrow">{eyebrow}</div> : null}
      <h2 className="yza-result-page__title">{title}</h2>
      <div className="yza-result-page__description">{description}</div>
      {details ? <div className="yza-result-page__details">{details}</div> : null}
      {actions ? <div className="yza-result-page__actions">{actions}</div> : null}
    </section>
  );
}
