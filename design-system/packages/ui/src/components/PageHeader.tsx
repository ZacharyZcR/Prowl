import type { ReactNode } from "react";

export interface PageHeaderProps {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
}

export function PageHeader({
  actions,
  description,
  eyebrow,
  meta,
  title
}: PageHeaderProps) {
  return (
    <section className="yza-page-header">
      <div className="yza-page-header__copy">
        {eyebrow ? <div className="yza-page-header__eyebrow">{eyebrow}</div> : null}
        <h1 className="yza-page-header__title">{title}</h1>
        {description ? <div className="yza-page-header__description">{description}</div> : null}
        {meta ? <div className="yza-page-header__meta">{meta}</div> : null}
      </div>
      {actions ? <div className="yza-page-header__actions">{actions}</div> : null}
    </section>
  );
}
