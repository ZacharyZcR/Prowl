import type { ReactNode } from "react";

export interface KeyValueItem {
  emphasis?: "default" | "danger" | "warning" | "success";
  hint?: ReactNode;
  label: ReactNode;
  mono?: boolean;
  value: ReactNode;
}

export interface KeyValueListProps {
  columns?: 1 | 2 | 3;
  items: KeyValueItem[];
}

export function KeyValueList({
  columns = 2,
  items
}: KeyValueListProps) {
  return (
    <dl className={`yza-key-value-list yza-key-value-list--cols-${columns}`}>
      {items.map((item, index) => (
        <div className="yza-key-value-list__item" key={index}>
          <dt className="yza-key-value-list__label">{item.label}</dt>
          <dd
            className={[
              "yza-key-value-list__value",
              item.mono ? "yza-key-value-list__value--mono" : "",
              item.emphasis ? `yza-key-value-list__value--${item.emphasis}` : ""
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {item.value}
          </dd>
          {item.hint ? <div className="yza-key-value-list__hint">{item.hint}</div> : null}
        </div>
      ))}
    </dl>
  );
}
