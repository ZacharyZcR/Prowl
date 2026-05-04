import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TopNavItem {
  active?: boolean;
  id: string;
  label: ReactNode;
}

export interface TopNavProps {
  actions?: ReactNode;
  brand: ReactNode;
  items: TopNavItem[];
  profile?: ReactNode;
  search?: ReactNode;
}

export function TopNav({ actions, brand, items, profile, search }: TopNavProps) {
  return (
    <div className="flex h-14 items-center gap-4 border-b border-[var(--stc-border)] bg-[var(--stc-surface-canvas)] px-4">
      <div className="shrink-0 font-semibold text-[var(--stc-text-primary)]">{brand}</div>
      <nav className="flex items-center gap-1">
        {items.map((item) => (
          <span
            key={item.id}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm cursor-pointer transition-colors",
              item.active
                ? "bg-[var(--stc-brand-600)]/10 text-[var(--stc-brand-600)] font-medium"
                : "text-[var(--stc-text-secondary)] hover:text-[var(--stc-text-primary)] hover:bg-[var(--stc-surface-subtle)]",
            )}
          >
            {item.label}
          </span>
        ))}
      </nav>
      <div className="flex-1" />
      {search && <div className="shrink-0">{search}</div>}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
      {profile && <div className="shrink-0">{profile}</div>}
    </div>
  );
}
