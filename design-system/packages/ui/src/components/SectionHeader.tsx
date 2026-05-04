import type { ReactNode } from "react";

export interface SectionHeaderProps {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
}

export function SectionHeader({
  actions,
  description,
  eyebrow,
  title
}: SectionHeaderProps) {
  return (
    <section className="yza-section-header">
      <div className="yza-section-header__copy">
        {eyebrow ? <div className="yza-section-header__eyebrow">{eyebrow}</div> : null}
        <h2 className="yza-section-header__title">{title}</h2>
        {description ? (
          <div className="yza-section-header__description">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="yza-section-header__actions">{actions}</div> : null}
    </section>
  );
}
