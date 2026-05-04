import type { ReactNode } from "react";

export interface FilterSummaryProps {
  actions?: ReactNode;
  chips?: ReactNode;
  metrics?: ReactNode;
  summary: ReactNode;
}

export function FilterSummary({
  actions,
  chips,
  metrics,
  summary
}: FilterSummaryProps) {
  return (
    <section className="yza-filter-summary">
      <div className="yza-filter-summary__main">
        <div className="yza-filter-summary__summary">{summary}</div>
        {chips ? <div className="yza-filter-summary__chips">{chips}</div> : null}
      </div>
      {metrics ? <div className="yza-filter-summary__metrics">{metrics}</div> : null}
      {actions ? <div className="yza-filter-summary__actions">{actions}</div> : null}
    </section>
  );
}
