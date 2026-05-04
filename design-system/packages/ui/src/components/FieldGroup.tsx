import type { ReactNode } from "react";

export interface FieldGroupProps {
  children: ReactNode;
  description?: ReactNode;
  hint?: ReactNode;
  title: ReactNode;
}

export function FieldGroup({
  children,
  description,
  hint,
  title
}: FieldGroupProps) {
  return (
    <section className="yza-field-group">
      <div className="yza-field-group__header">
        <div className="yza-field-group__title">{title}</div>
        {hint ? <div className="yza-field-group__hint">{hint}</div> : null}
      </div>
      {description ? <div className="yza-field-group__description">{description}</div> : null}
      <div className="yza-field-group__body">{children}</div>
    </section>
  );
}
