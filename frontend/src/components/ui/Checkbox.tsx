import { type InputHTMLAttributes, type ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: ReactNode;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, indeterminate, className, disabled, id, ...rest }, ref) => {
    const checkId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const inputRef = (node: HTMLInputElement | null) => {
      if (node) node.indeterminate = !!indeterminate;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    };
    return (
      <label
        htmlFor={checkId}
        className={cn(
          "inline-flex gap-2 text-sm text-[var(--stc-text-primary)] cursor-pointer select-none",
          disabled && "pointer-events-none opacity-50",
          className,
        )}
      >
        <input
          ref={inputRef}
          id={checkId}
          type="checkbox"
          disabled={disabled}
          className="h-4 w-4 mt-0.5 rounded border-[var(--stc-border)] accent-[var(--stc-brand-600)] cursor-pointer"
          {...rest}
        />
        <div className="flex flex-col">
          {label && <span>{label}</span>}
          {description && <span className="text-xs text-[var(--stc-text-tertiary)]">{description}</span>}
        </div>
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";
