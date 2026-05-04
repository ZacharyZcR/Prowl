import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  tone?: "primary" | "accent" | "outline" | "neutral" | "danger" | "success";
  size?: "sm" | "md" | "lg";
}

const toneClasses: Record<string, string> = {
  primary:
    "bg-[var(--stc-brand-600)] text-white hover:bg-[var(--stc-brand-700)] active:bg-[var(--stc-brand-800)]",
  accent:
    "bg-[var(--stc-accent-500)] text-white hover:bg-[var(--stc-accent-400)] active:bg-[var(--stc-accent-300)]",
  outline:
    "border border-[var(--stc-border)] bg-transparent text-[var(--stc-text-primary)] hover:bg-[var(--stc-surface-subtle)]",
  neutral:
    "bg-[var(--stc-neutral-200)] text-[var(--stc-text-primary)] hover:bg-[var(--stc-neutral-300)]",
  danger:
    "bg-[var(--stc-danger-600)] text-white hover:bg-[var(--stc-danger-700)]",
  success:
    "bg-[var(--stc-success-600)] text-white hover:bg-[var(--stc-success-700)]",
};

const sizeClasses: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs rounded-md",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-6 py-2.5 text-base rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, tone = "primary", size = "md", className, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--stc-brand-600)]",
        toneClasses[tone],
        sizeClasses[size],
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  ),
);
Button.displayName = "Button";
