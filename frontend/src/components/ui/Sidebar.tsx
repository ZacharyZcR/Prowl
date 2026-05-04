import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SidebarItem {
  active?: boolean;
  badge?: ReactNode;
  id: string;
  label: ReactNode;
}

export interface SidebarSection {
  id: string;
  items: SidebarItem[];
  title: ReactNode;
}

export interface SidebarProps {
  brand?: ReactNode;
  sections: SidebarSection[];
}

export function Sidebar({ brand, sections }: SidebarProps) {
  return (
    <div className="flex h-full w-60 flex-col border-r border-[var(--stc-border)] bg-[var(--stc-surface-canvas)]">
      {brand && (
        <div className="flex h-14 items-center px-4 border-b border-[var(--stc-border)]">{brand}</div>
      )}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.id} className="mb-4">
            <h4 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--stc-text-tertiary)]">
              {section.title}
            </h4>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors",
                    item.active
                      ? "bg-[var(--stc-brand-600)]/10 text-[var(--stc-brand-600)] font-medium"
                      : "text-[var(--stc-text-secondary)] hover:bg-[var(--stc-surface-subtle)] hover:text-[var(--stc-text-primary)]",
                  )}
                >
                  <span>{item.label}</span>
                  {item.badge && <span>{item.badge}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
