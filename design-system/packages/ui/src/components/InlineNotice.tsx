import type { ReactNode } from "react";

export interface InlineNoticeProps {
  actions?: ReactNode;
  description?: ReactNode;
  title: ReactNode;
  tone?: "info" | "success" | "warning" | "danger";
}

export function InlineNotice({
  actions,
  description,
  title,
  tone = "info"
}: InlineNoticeProps) {
  return (
    <section className={`yza-inline-notice yza-inline-notice--${tone}`}>
      <div className="yza-inline-notice__main">
        <div className="yza-inline-notice__title">{title}</div>
        {description ? <div className="yza-inline-notice__description">{description}</div> : null}
      </div>
      {actions ? <div className="yza-inline-notice__actions">{actions}</div> : null}
    </section>
  );
}
