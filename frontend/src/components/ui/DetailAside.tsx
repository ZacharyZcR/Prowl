import { type ReactNode } from "react";

export interface DetailAsideSection {
  title: string;
  items: { label: string; value: ReactNode }[];
}

export interface DetailAsideProps {
  title?: ReactNode;
  sections: DetailAsideSection[];
}

export function DetailAside({ title, sections }: DetailAsideProps) {
  return (
    <aside className="rounded-lg border border-[var(--stc-border)] bg-[var(--stc-surface-canvas)] p-5">
      {title && (
        <h3 className="mb-4 text-sm font-semibold text-[var(--stc-text-primary)] border-b border-[var(--stc-border)] pb-3">
          {title}
        </h3>
      )}
      <div className="flex flex-col gap-5">
        {sections.map((section, si) => (
          <div key={si} className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--stc-text-tertiary)]">
              {section.title}
            </h4>
            <dl className="flex flex-col gap-2">
              {section.items.map((item, ii) => (
                <div key={ii} className="flex items-baseline justify-between gap-4 text-sm">
                  <dt className="shrink-0 text-[var(--stc-text-tertiary)]">{item.label}</dt>
                  <dd className="text-right font-medium text-[var(--stc-text-primary)]">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </aside>
  );
}
