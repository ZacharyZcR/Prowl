import type { ReactNode } from "react";

export interface BreadcrumbItem {
  href?: string;
  label: ReactNode;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="面包屑" className="yza-breadcrumb">
      <ol className="yza-breadcrumb__list">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li className="yza-breadcrumb__item" key={`${index}-${String(item.label)}`}>
              {item.href && !isCurrent ? (
                <a className="yza-breadcrumb__link" href={item.href}>
                  {item.label}
                </a>
              ) : (
                <span
                  aria-current={isCurrent ? "page" : undefined}
                  className="yza-breadcrumb__current"
                >
                  {item.label}
                </span>
              )}
              {!isCurrent ? (
                <span aria-hidden="true" className="yza-breadcrumb__separator">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
