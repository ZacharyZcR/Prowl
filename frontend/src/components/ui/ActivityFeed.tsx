import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "info" | "success" | "warning" | "danger";

const toneDot: Record<Tone, string> = {
  default: "bg-[var(--stc-neutral-300)]",
  info: "bg-[var(--stc-brand-500)]",
  success: "bg-[var(--stc-success-500)]",
  warning: "bg-[var(--stc-warning-500)]",
  danger: "bg-[var(--stc-danger-500)]",
};

export interface ActivityFeedItem {
  title: string;
  description?: ReactNode;
  time?: string;
  meta?: string;
  tone?: Tone;
}

export interface ActivityFeedProps {
  items: ActivityFeedItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div className="flex flex-col">
      {items.map((item, i) => (
        <div key={i} className="relative flex gap-3 pb-6 last:pb-0">
          {i < items.length - 1 && (
            <div className="absolute left-[11px] top-6 bottom-0 w-px bg-[var(--stc-border)]" />
          )}
          <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--stc-surface-subtle)] text-[var(--stc-text-tertiary)]">
            <span className={cn("h-2 w-2 rounded-full", toneDot[item.tone ?? "default"])} />
          </div>
          <div className="flex flex-1 flex-col gap-0.5 pt-0.5">
            <div className="text-sm text-[var(--stc-text-primary)]">{item.title}</div>
            {item.description && (
              <div className="text-xs text-[var(--stc-text-secondary)]">{item.description}</div>
            )}
            <div className="flex items-center gap-2">
              {item.time && (
                <span className="text-xs text-[var(--stc-text-tertiary)]">{item.time}</span>
              )}
              {item.meta && (
                <span className="text-xs text-[var(--stc-text-tertiary)]">{item.meta}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
