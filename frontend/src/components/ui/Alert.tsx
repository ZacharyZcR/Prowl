import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  description?: ReactNode;
  heading: ReactNode;
  icon?: ReactNode;
  tone?: "info" | "success" | "warning" | "danger";
}

const toneClasses: Record<string, string> = {
  info: "border-[var(--stc-brand-600)] bg-[var(--stc-brand-600)]/5 text-[var(--stc-brand-600)]",
  success: "border-[var(--stc-success-600)] bg-[var(--stc-success-600)]/5 text-[var(--stc-success-600)]",
  warning: "border-[var(--stc-warning-500)] bg-[var(--stc-warning-500)]/5 text-[var(--stc-warning-500)]",
  danger: "border-[var(--stc-danger-600)] bg-[var(--stc-danger-600)]/5 text-[var(--stc-danger-600)]",
};

export function Alert({ description, heading, icon, tone = "info", className, ...rest }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn("flex gap-3 rounded-lg border-l-4 p-4", toneClasses[tone], className)}
      {...rest}
    >
      {icon && <span className="shrink-0 mt-0.5">{icon}</span>}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{heading}</p>
        {description && <p className="text-sm opacity-80 text-[var(--stc-text-secondary)]">{description}</p>}
      </div>
    </div>
  );
}
