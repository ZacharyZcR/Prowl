import type { ReactNode } from "react";

export interface ActionBarProps {
  actions?: ReactNode;
  leading?: ReactNode;
  summary?: ReactNode;
}

export function ActionBar({
  actions,
  leading,
  summary
}: ActionBarProps) {
  return (
    <section className="yza-action-bar">
      <div className="yza-action-bar__main">
        {leading ? <div className="yza-action-bar__leading">{leading}</div> : null}
        {summary ? <div className="yza-action-bar__summary">{summary}</div> : null}
      </div>
      {actions ? <div className="yza-action-bar__actions">{actions}</div> : null}
    </section>
  );
}
