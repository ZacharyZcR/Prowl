import type { ReactNode } from "react";

export interface DetailMetaItem {
  label: ReactNode;
  value: ReactNode;
}

export interface DetailHeaderProps {
  actions?: ReactNode;
  eyebrow?: ReactNode;
  meta?: DetailMetaItem[];
  status?: ReactNode;
  subtitle?: ReactNode;
  title: ReactNode;
}

export function DetailHeader({
  actions,
  eyebrow,
  meta = [],
  status,
  subtitle,
  title
}: DetailHeaderProps) {
  return (
    <section className="yza-detail-header">
      <div className="yza-detail-header__main">
        {eyebrow ? <div className="yza-detail-header__eyebrow">{eyebrow}</div> : null}
        <div className="yza-detail-header__title-row">
          <h1 className="yza-detail-header__title">{title}</h1>
          {status ? <div className="yza-detail-header__status">{status}</div> : null}
        </div>
        {subtitle ? <div className="yza-detail-header__subtitle">{subtitle}</div> : null}
        {meta.length > 0 ? (
          <dl className="yza-detail-header__meta">
            {meta.map((item, index) => (
              <div className="yza-detail-header__meta-item" key={index}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
      {actions ? <div className="yza-detail-header__actions">{actions}</div> : null}
    </section>
  );
}
