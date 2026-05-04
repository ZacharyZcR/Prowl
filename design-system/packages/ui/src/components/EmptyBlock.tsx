import type { ReactNode } from "react";

export interface EmptyBlockProps {
  action?: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
}

export function EmptyBlock({
  action,
  description,
  icon,
  title
}: EmptyBlockProps) {
  return (
    <section className="yza-empty-block">
      <div className="yza-empty-block__icon" aria-hidden="true">
        {icon ?? "∅"}
      </div>
      <div className="yza-empty-block__title">{title}</div>
      <div className="yza-empty-block__description">{description}</div>
      {action ? <div className="yza-empty-block__action">{action}</div> : null}
    </section>
  );
}
