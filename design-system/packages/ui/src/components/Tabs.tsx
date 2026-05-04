import { useState } from "react";

import type { ReactNode } from "react";

export interface TabItem {
  content: ReactNode;
  id: string;
  label: ReactNode;
}

export interface TabsProps {
  defaultValue?: string;
  items: TabItem[];
}

export function Tabs({ defaultValue, items }: TabsProps) {
  const initialValue = defaultValue ?? items[0]?.id ?? "";
  const [activeId, setActiveId] = useState(initialValue);
  const activeItem = items.find((item) => item.id === activeId) ?? items[0];

  return (
    <div className="yza-tabs">
      <div aria-label="选项卡" className="yza-tabs__list" role="tablist">
        {items.map((item) => {
          const isActive = item.id === activeItem?.id;

          return (
            <button
              aria-selected={isActive}
              className="yza-tabs__tab"
              data-active={isActive}
              key={item.id}
              onClick={() => setActiveId(item.id)}
              role="tab"
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="yza-tabs__panel" role="tabpanel">
        {activeItem?.content}
      </div>
    </div>
  );
}
