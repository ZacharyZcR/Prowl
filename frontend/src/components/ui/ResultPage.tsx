import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ResultPageProps {
  children?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  tone?: "success" | "danger" | "warning" | "info";
}

const toneColor: Record<string, string> = {
  success: "text-[var(--stc-success-600)]",
  danger: "text-[var(--stc-danger-600)]",
  warning: "text-[var(--stc-warning-600)]",
  info: "text-[var(--stc-brand-600)]",
};

const toneIcon: Record<string, string> = {
  success: "M5 13l4 4L19 7",
  danger: "M6 18L18 6M6 6l12 12",
  warning: "M12 8v4m0 4h.01",
  info: "M12 8v4m0 4h.01",
};

export function ResultPage({ children, title, description, actions, tone = "info" }: ResultPageProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(toneColor[tone])}
      >
        <circle cx="12" cy="12" r="10" />
        <path d={toneIcon[tone]} />
      </svg>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-[var(--stc-text-primary)]">{title}</h1>
        {description && <p className="text-sm text-[var(--stc-text-secondary)] max-w-md">{description}</p>}
      </div>
      {actions && <div className="mt-2">{actions}</div>}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
