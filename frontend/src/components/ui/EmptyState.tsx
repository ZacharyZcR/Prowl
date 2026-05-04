import { type ReactNode } from "react";

export interface EmptyStateProps {
  action?: ReactNode;
  description: ReactNode;
  heading: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ action, description, heading, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      {icon && <span className="text-4xl text-[var(--stc-text-tertiary)]">{icon}</span>}
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-[var(--stc-text-primary)]">{heading}</h3>
        <p className="text-sm text-[var(--stc-text-secondary)] max-w-md">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
