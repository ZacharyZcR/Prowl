import type { ReactNode } from "react";

export interface PageSectionProps {
  actions?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
}

export function PageSection({
  actions,
  aside,
  children,
  description,
  eyebrow,
  title
}: PageSectionProps) {
  return (
    <section className="yza-page-section">
      <header className="yza-page-section__header">
        <div className="yza-page-section__copy">
          {eyebrow ? <div className="yza-page-section__eyebrow">{eyebrow}</div> : null}
          <h2 className="yza-page-section__title">{title}</h2>
          {description ? <div className="yza-page-section__description">{description}</div> : null}
        </div>
        {actions ? <div className="yza-page-section__actions">{actions}</div> : null}
      </header>
      <div className={`yza-page-section__body${aside ? " yza-page-section__body--with-aside" : ""}`}>
        <div className="yza-page-section__content">{children}</div>
        {aside ? <aside className="yza-page-section__aside">{aside}</aside> : null}
      </div>
    </section>
  );
}
