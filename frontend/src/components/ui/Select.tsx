import { type SelectHTMLAttributes, type ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  message?: string;
  leading?: ReactNode;
  status?: "default" | "error" | "success";
}

const statusRing: Record<string, string> = {
  default: "border-[var(--stc-border)] focus-within:border-[var(--stc-brand-600)]",
  error: "border-[var(--stc-danger-600)]",
  success: "border-[var(--stc-success-600)]",
};

const messageTone: Record<string, string> = {
  default: "text-[var(--stc-text-tertiary)]",
  error: "text-[var(--stc-danger-600)]",
  success: "text-[var(--stc-success-600)]",
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, message, leading, status = "default", className, id, disabled, children, ...rest }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-[var(--stc-text-primary)]">
            {label}
            {hint && <span className="ml-1 font-normal text-[var(--stc-text-tertiary)]">({hint})</span>}
          </label>
        )}
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border bg-[var(--stc-surface-canvas)] px-3 py-2 text-sm transition-colors",
            statusRing[status],
            disabled && "pointer-events-none opacity-50",
            className,
          )}
        >
          {leading && <span className="shrink-0 text-[var(--stc-text-tertiary)]">{leading}</span>}
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className="w-full bg-transparent text-[var(--stc-text-primary)] outline-none appearance-none cursor-pointer"
            {...rest}
          >
            {children}
          </select>
        </div>
        {message && <p className={cn("text-xs", messageTone[status])}>{message}</p>}
      </div>
    );
  },
);
Select.displayName = "Select";
