import type { ReactNode } from "react";

export interface FormSectionProps {
  actions?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  title: ReactNode;
}

export function FormSection({
  actions,
  children,
  description,
  title
}: FormSectionProps) {
  return (
    <section className="yza-form-section">
      <div className="yza-form-section__header">
        <div className="yza-form-section__copy">
          <h2 className="yza-form-section__title">{title}</h2>
          {description ? <div className="yza-form-section__description">{description}</div> : null}
        </div>
        {actions ? <div className="yza-form-section__actions">{actions}</div> : null}
      </div>
      <div className="yza-form-section__body">{children}</div>
    </section>
  );
}
