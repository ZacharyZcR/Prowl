import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState
} from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";

export type PopoverSide = "top" | "bottom";

export interface PopoverProps extends Omit<HTMLAttributes<HTMLDivElement>, "content" | "title"> {
  children?: ReactNode;
  content: ReactNode;
  side?: PopoverSide;
  title?: ReactNode;
}

export function Popover({
  children,
  className,
  content,
  side = "bottom",
  title,
  ...props
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
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

  const trigger = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        "aria-controls": popoverId,
        "aria-expanded": open,
        onClick: () => setOpen((current) => !current)
      })
    : (
      <button
        aria-controls={popoverId}
        aria-expanded={open}
        className="yza-popover__trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {children ?? "打开浮层"}
      </button>
    );

  return (
    <div
      className={["yza-popover", `yza-popover--${side}`, className].filter(Boolean).join(" ")}
      ref={rootRef}
      {...props}
    >
      <span className="yza-popover__trigger-wrap">{trigger}</span>
      {open ? (
        <div className="yza-popover__panel" id={popoverId} role="dialog">
          {title ? <div className="yza-popover__title">{title}</div> : null}
          <div className="yza-popover__content">{content}</div>
        </div>
      ) : null}
    </div>
  );
}
