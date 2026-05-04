import { type ReactNode } from "react";

export interface FilterSummaryProps {
  chips?: ReactNode;
  summary?: ReactNode;
}

export function FilterSummary({ chips, summary }: FilterSummaryProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--stc-text-secondary)]">
      {chips}
      {summary && <span>{summary}</span>}
    </div>
  );
}
