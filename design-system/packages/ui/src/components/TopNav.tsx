import type { ReactNode } from "react";

export interface TopNavItem {
  active?: boolean;
  id: string;
  label: ReactNode;
}

export interface TopNavProps {
  actions?: ReactNode;
  brand: ReactNode;
  items: TopNavItem[];
  profile?: ReactNode;
  search?: ReactNode;
}

export function TopNav({ actions, brand, items, profile, search }: TopNavProps) {
  return (
    <header className="yza-topnav">
      <div className="yza-topnav__brand">{brand}</div>
      <nav className="yza-topnav__nav">
        {items.map((item) => (
          <button
            className="yza-topnav__item"
            data-active={item.active}
            key={item.id}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="yza-topnav__right">
        {search ? <div className="yza-topnav__search">{search}</div> : null}
        {actions}
        {profile ? <div className="yza-topnav__profile">{profile}</div> : null}
      </div>
    </header>
  );
}
