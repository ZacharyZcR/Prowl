import type { ReactNode } from "react";

export interface ChartCardProps {
  actions?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  title: ReactNode;
}

export function ChartCard({
  actions,
  children,
  description,
  footer,
  title
}: ChartCardProps) {
  return (
    <section className="yza-chart-card">
      <div className="yza-chart-card__header">
        <div className="yza-chart-card__copy">
          <h2 className="yza-chart-card__title">{title}</h2>
          {description ? <div className="yza-chart-card__description">{description}</div> : null}
        </div>
        {actions ? <div className="yza-chart-card__actions">{actions}</div> : null}
      </div>
      <div className="yza-chart-card__body">{children}</div>
      {footer ? <div className="yza-chart-card__footer">{footer}</div> : null}
    </section>
  );
}
