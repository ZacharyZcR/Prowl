import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-[var(--stc-text-tertiary)]">/</span>}
            {isLast ? (
              <span className="font-medium text-[var(--stc-text-primary)]">{item.label}</span>
            ) : item.href ? (
              <a
                href={item.href}
                onClick={item.onClick}
                className={cn("text-[var(--stc-text-secondary)] hover:text-[var(--stc-text-primary)] transition-colors")}
              >
                {item.label}
              </a>
            ) : (
              <button
                onClick={item.onClick}
                className="text-[var(--stc-text-secondary)] hover:text-[var(--stc-text-primary)] transition-colors"
              >
                {item.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
