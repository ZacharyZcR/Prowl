import type { ReactNode } from "react";

export interface EmptyStateProps {
  action?: ReactNode;
  description: ReactNode;
  heading: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({
  action,
  description,
  heading,
  icon = "□"
}: EmptyStateProps) {
  return (
    <div className="yza-empty-state">
      <div className="yza-empty-state__icon">{icon}</div>
      <div className="yza-empty-state__heading">{heading}</div>
      <div className="yza-empty-state__description">{description}</div>
      {action ? <div className="yza-empty-state__action">{action}</div> : null}
    </div>
  );
}
