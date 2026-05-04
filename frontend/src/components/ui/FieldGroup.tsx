import { type ReactNode } from "react";

export interface FieldGroupProps {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
}

export function FieldGroup({ children, title, description }: FieldGroupProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {title && <span className="text-sm font-medium text-[var(--stc-text-primary)]">{title}</span>}
      {children}
      {description && <span className="text-xs text-[var(--stc-text-tertiary)]">{description}</span>}
    </div>
  );
}
