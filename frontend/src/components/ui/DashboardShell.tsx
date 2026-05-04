import { type ReactNode } from "react";

export interface DashboardShellProps {
  children: ReactNode;
  header?: ReactNode;
  sidebar?: ReactNode;
}

export function DashboardShell({ children, header, sidebar }: DashboardShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--stc-surface-canvas)]">
      {sidebar && <aside className="shrink-0">{sidebar}</aside>}
      <div className="flex flex-1 flex-col overflow-hidden">
        {header && <header className="shrink-0">{header}</header>}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
