import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  content: ReactNode;
  id: string;
  label: ReactNode;
}

export interface TabsProps {
  defaultValue?: string;
  items: TabItem[];
}

export function Tabs({ defaultValue, items }: TabsProps) {
  const [active, setActive] = useState(defaultValue ?? items[0]?.id);
  const current = items.find((t) => t.id === active);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex border-b border-[var(--stc-border)]" role="tablist">
        {items.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={tab.id === active}
            onClick={() => setActive(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2",
              tab.id === active
                ? "border-[var(--stc-brand-600)] text-[var(--stc-brand-600)]"
                : "border-transparent text-[var(--stc-text-secondary)] hover:text-[var(--stc-text-primary)]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {current && <div role="tabpanel">{current.content}</div>}
    </div>
  );
}
