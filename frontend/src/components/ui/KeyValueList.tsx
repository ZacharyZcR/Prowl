import { type ReactNode } from "react";

export interface KeyValueListProps {
  items: { label: ReactNode; value: ReactNode }[];
}

export function KeyValueList({ items }: KeyValueListProps) {
  return (
    <dl className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 text-sm">
          <dt className="shrink-0 text-[var(--stc-text-tertiary)]">{item.label}</dt>
          <dd className="text-right font-medium text-[var(--stc-text-primary)]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
