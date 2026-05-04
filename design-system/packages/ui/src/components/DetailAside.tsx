import type { ReactNode } from "react";

export interface DetailAsideItem {
  label: ReactNode;
  value: ReactNode;
}

export interface DetailAsideSection {
  description?: ReactNode;
  items?: DetailAsideItem[];
  meta?: ReactNode;
  title: ReactNode;
}

export interface DetailAsideProps {
  footer?: ReactNode;
  sections: DetailAsideSection[];
  title?: ReactNode;
}

export function DetailAside({
  footer,
  sections,
  title
}: DetailAsideProps) {
  return (
    <aside className="yza-detail-aside">
      {title ? <h3 className="yza-detail-aside__title">{title}</h3> : null}
      <div className="yza-detail-aside__sections">
        {sections.map((section, index) => (
          <section className="yza-detail-aside__section" key={index}>
            <div className="yza-detail-aside__section-title">{section.title}</div>
            {section.description ? (
              <div className="yza-detail-aside__section-description">{section.description}</div>
            ) : null}
            {section.items ? (
              <dl className="yza-detail-aside__list">
                {section.items.map((item, itemIndex) => (
                  <div className="yza-detail-aside__item" key={itemIndex}>
                    <dt className="yza-detail-aside__label">{item.label}</dt>
                    <dd className="yza-detail-aside__value">{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {section.meta ? <div className="yza-detail-aside__meta">{section.meta}</div> : null}
          </section>
        ))}
      </div>
      {footer ? <div className="yza-detail-aside__footer">{footer}</div> : null}
    </aside>
  );
}
