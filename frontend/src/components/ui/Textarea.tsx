import { type TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  message?: string;
  status?: "default" | "error" | "success";
}

const statusRing: Record<string, string> = {
  default: "border-[var(--stc-border)] focus:border-[var(--stc-brand-600)]",
  error: "border-[var(--stc-danger-600)]",
  success: "border-[var(--stc-success-600)]",
};

const messageTone: Record<string, string> = {
  default: "text-[var(--stc-text-tertiary)]",
  error: "text-[var(--stc-danger-600)]",
  success: "text-[var(--stc-success-600)]",
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, message, status = "default", className, id, disabled, ...rest }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-[var(--stc-text-primary)]">
            {label}
            {hint && <span className="ml-1 font-normal text-[var(--stc-text-tertiary)]">({hint})</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          className={cn(
            "rounded-lg border bg-[var(--stc-surface-canvas)] px-3 py-2 text-sm text-[var(--stc-text-primary)] placeholder:text-[var(--stc-text-tertiary)] outline-none transition-colors resize-y min-h-[80px]",
            statusRing[status],
            disabled && "pointer-events-none opacity-50",
            className,
          )}
          {...rest}
        />
        {message && <p className={cn("text-xs", messageTone[status])}>{message}</p>}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
