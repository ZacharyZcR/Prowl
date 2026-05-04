import type { ReactNode } from "react";

export interface EmptyTableProps {
  action?: ReactNode;
  description: ReactNode;
  headers: ReactNode[];
  heading: ReactNode;
}

export function EmptyTable({
  action,
  description,
  headers,
  heading
}: EmptyTableProps) {
  return (
    <div className="yza-empty-table">
      <div className="yza-table-wrap">
        <table className="yza-table">
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={`${index}-${String(header)}`}>{header}</th>
              ))}
            </tr>
          </thead>
        </table>
      </div>

      <div className="yza-empty-table__body">
        <div className="yza-empty-table__icon">⊘</div>
        <div className="yza-empty-table__heading">{heading}</div>
        <div className="yza-empty-table__description">{description}</div>
        {action ? <div className="yza-empty-table__action">{action}</div> : null}
      </div>
    </div>
  );
}
