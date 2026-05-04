import type { ReactNode } from "react";

export interface DashboardShellProps {
  children: ReactNode;
  header?: ReactNode;
  sidebar?: ReactNode;
}

export function DashboardShell({
  children,
  header,
  sidebar
}: DashboardShellProps) {
  return (
    <div className="yza-dashboard-shell">
      {header ? <div className="yza-dashboard-shell__header">{header}</div> : null}
      <div className="yza-dashboard-shell__body">
        {sidebar ? <div className="yza-dashboard-shell__sidebar">{sidebar}</div> : null}
        <main className="yza-dashboard-shell__content">{children}</main>
      </div>
    </div>
  );
}
