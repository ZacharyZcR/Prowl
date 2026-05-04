import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

export interface DataTableColumn<Row extends Record<string, ReactNode>> {
  align?: "left" | "center" | "right";
  header: ReactNode;
  key: keyof Row;
  render?: (row: Row) => ReactNode;
  width?: string;
}

export interface DataTableProps<Row extends Record<string, ReactNode>> {
  columns: DataTableColumn<Row>[];
  getRowAriaLabel?: (row: Row, rowIndex: number) => string;
  onRowClick?: (row: Row, rowIndex: number) => void;
  rows: Row[];
}

function getResponsiveColumnLabel(header: ReactNode) {
  if (typeof header === "string" || typeof header === "number") {
    return String(header);
  }

  return undefined;
}

export function DataTable<Row extends Record<string, ReactNode>>({
  columns,
  getRowAriaLabel,
  onRowClick,
  rows
}: DataTableProps<Row>) {
  function handleRowClick(row: Row, rowIndex: number, event: MouseEvent<HTMLTableRowElement>) {
    if (!onRowClick || isInteractiveTarget(event.target)) return;
    onRowClick(row, rowIndex);
  }

  function handleRowKeyDown(row: Row, rowIndex: number, event: KeyboardEvent<HTMLTableRowElement>) {
    if (!onRowClick || isInteractiveTarget(event.target)) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onRowClick(row, rowIndex);
  }

  return (
    <div className="yza-table-wrap">
      <table className="yza-table">
        <colgroup>
          {columns.map((column) => (
            <col key={String(column.key)} style={column.width ? { width: column.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                style={{ textAlign: column.align ?? "left", width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={onRowClick ? "yza-table__row--clickable" : undefined}
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              aria-label={onRowClick && getRowAriaLabel ? getRowAriaLabel(row, rowIndex) : undefined}
              onClick={(event) => handleRowClick(row, rowIndex, event)}
              onKeyDown={(event) => handleRowKeyDown(row, rowIndex, event)}
            >
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  data-column={getResponsiveColumnLabel(column.header)}
                  style={{ textAlign: column.align ?? "left", width: column.width }}
                >
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("a, button, input, select, textarea, [role='button'], [data-row-click-ignore]"));
}
