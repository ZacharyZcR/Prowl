import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

export interface DropdownMenuItem {
  danger?: boolean;
  disabled?: boolean;
  hint?: ReactNode;
  id: string;
  label: ReactNode;
  onSelect?: () => void;
}

export interface DropdownMenuProps {
  items: DropdownMenuItem[];
  label: ReactNode;
}

export function DropdownMenu({ items, label }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  return (
    <div className="yza-dropdown" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        className="yza-dropdown__trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{label}</span>
        <span aria-hidden="true">▾</span>
      </button>

      {open ? (
        <div className="yza-dropdown__menu" id={menuId} role="menu">
          {items.map((item) => (
            <button
              className={["yza-dropdown__item", item.danger ? "is-danger" : ""]
                .filter(Boolean)
                .join(" ")}
              disabled={item.disabled}
              key={item.id}
              onClick={() => {
                item.onSelect?.();
                setOpen(false);
              }}
              role="menuitem"
              type="button"
            >
              <span className="yza-dropdown__item-label">{item.label}</span>
              {item.hint ? <span className="yza-dropdown__item-hint">{item.hint}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
