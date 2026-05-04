import type { ReactNode } from "react";

export interface SidebarItem {
  active?: boolean;
  badge?: ReactNode;
  id: string;
  label: ReactNode;
}

export interface SidebarSection {
  id: string;
  items: SidebarItem[];
  title: ReactNode;
}

export interface SidebarProps {
  brand?: ReactNode;
  sections: SidebarSection[];
}

export function Sidebar({ brand, sections }: SidebarProps) {
  return (
    <aside className="yza-sidebar">
      {brand ? <div className="yza-sidebar__brand">{brand}</div> : null}
      <div className="yza-sidebar__sections">
        {sections.map((section) => (
          <section className="yza-sidebar__section" key={section.id}>
            <div className="yza-sidebar__section-title">{section.title}</div>
            <div className="yza-sidebar__list">
              {section.items.map((item) => (
                <button
                  className="yza-sidebar__item"
                  data-active={item.active}
                  key={item.id}
                  type="button"
                >
                  <span>{item.label}</span>
                  {item.badge ? <span>{item.badge}</span> : null}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
