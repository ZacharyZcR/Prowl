import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DataTableColumn<Row> {
  align?: "left" | "center" | "right";
  header: ReactNode;
  key: keyof Row;
  render?: (row: Row) => ReactNode;
  width?: string;
}

export interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[];
  rows: Row[];
}

const alignClass: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export function DataTable<Row extends Record<string, unknown>>({ columns, rows }: DataTableProps<Row>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[var(--stc-border)]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--stc-border)] bg-[var(--stc-surface-subtle)]">
            {columns.map((col, i) => (
              <th
                key={String(col.key)}
                className={cn(
                  "px-4 py-3 font-medium text-[var(--stc-text-secondary)]",
                  alignClass[col.align ?? "left"],
                  i === 0 && "rounded-tl-lg",
                  i === columns.length - 1 && "rounded-tr-lg",
                )}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-[var(--stc-border)] last:border-b-0 hover:bg-[var(--stc-surface-subtle)] transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={cn("px-4 py-3 text-[var(--stc-text-primary)]", alignClass[col.align ?? "left"])}
                >
                  {col.render ? col.render(row) : (row[col.key] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
