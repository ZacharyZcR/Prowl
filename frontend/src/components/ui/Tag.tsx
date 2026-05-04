import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  icon?: ReactNode;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
}

const toneClasses: Record<string, string> = {
  neutral: "bg-[var(--stc-neutral-200)] text-[var(--stc-text-secondary)]",
  info: "bg-[var(--stc-brand-600)]/10 text-[var(--stc-brand-600)]",
  success: "bg-[var(--stc-success-600)]/10 text-[var(--stc-success-600)]",
  warning: "bg-[var(--stc-warning-500)]/10 text-[var(--stc-warning-500)]",
  danger: "bg-[var(--stc-danger-600)]/10 text-[var(--stc-danger-600)]",
};

export function Tag({ icon, tone = "neutral", className, children, ...rest }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...rest}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
