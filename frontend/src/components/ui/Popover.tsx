import { type ReactNode, useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface PopoverProps {
  children: ReactNode;
  content: ReactNode;
  title?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({ children, content, open: controlledOpen, onOpenChange }: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const ref = useRef<HTMLDivElement>(null);

  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  });

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen(!isOpen)}>{children}</div>
      {isOpen && (
        <div
          className={cn(
            "absolute left-0 top-full z-50 mt-2 min-w-[200px] rounded-lg border border-[var(--stc-border)] bg-[var(--stc-surface-canvas)] p-4 shadow-lg",
            "animate-in fade-in zoom-in-95",
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
