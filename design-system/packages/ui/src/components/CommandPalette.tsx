import type { ReactNode } from "react";

export interface CommandItem {
  hint?: ReactNode;
  id: string;
  label: ReactNode;
  shortcut?: ReactNode;
}

export interface CommandGroup {
  id: string;
  items: CommandItem[];
  title: ReactNode;
}

export interface CommandPaletteProps {
  groups: CommandGroup[];
  queryPlaceholder?: string;
}

export function CommandPalette({
  groups,
  queryPlaceholder = "搜索命令..."
}: CommandPaletteProps) {
  return (
    <div className="yza-command">
      <div className="yza-command__search">
        <input className="yza-command__input" placeholder={queryPlaceholder} />
        <span className="yza-command__hint">ESC</span>
      </div>
      <div className="yza-command__groups">
        {groups.map((group) => (
          <section className="yza-command__group" key={group.id}>
            <div className="yza-command__group-title">{group.title}</div>
            <div className="yza-command__list">
              {group.items.map((item) => (
                <button className="yza-command__item" key={item.id} type="button">
                  <span className="yza-command__item-main">
                    <span>{item.label}</span>
                    {item.hint ? (
                      <span className="yza-command__item-hint">{item.hint}</span>
                    ) : null}
                  </span>
                  {item.shortcut ? (
                    <span className="yza-command__shortcut">{item.shortcut}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
