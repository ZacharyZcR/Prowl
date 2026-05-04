import type { ReactNode } from "react";

export interface BulkActionBarProps {
  actions?: ReactNode;
  selectionCount: ReactNode;
  summary?: ReactNode;
}

export function BulkActionBar({
  actions,
  selectionCount,
  summary
}: BulkActionBarProps) {
  return (
    <section className="yza-bulk-action-bar">
      <div className="yza-bulk-action-bar__main">
        <div className="yza-bulk-action-bar__count">{selectionCount}</div>
        {summary ? <div className="yza-bulk-action-bar__summary">{summary}</div> : null}
      </div>
      {actions ? <div className="yza-bulk-action-bar__actions">{actions}</div> : null}
    </section>
  );
}
