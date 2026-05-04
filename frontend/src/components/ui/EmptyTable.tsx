import { type ReactNode } from "react";

export interface EmptyTableProps {
  action?: ReactNode;
  description: ReactNode;
  headers: ReactNode[];
  heading: ReactNode;
}

export function EmptyTable({ action, description, headers, heading }: EmptyTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[var(--stc-border)]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--stc-border)] bg-[var(--stc-surface-subtle)]">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-left font-medium text-[var(--stc-text-secondary)]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={headers.length} className="px-4 py-16">
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <h3 className="text-base font-semibold text-[var(--stc-text-primary)]">{heading}</h3>
                <p className="text-sm text-[var(--stc-text-secondary)] max-w-sm">{description}</p>
                {action && <div className="mt-2">{action}</div>}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
