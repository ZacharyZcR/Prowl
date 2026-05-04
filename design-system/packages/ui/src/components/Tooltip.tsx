import { cloneElement, isValidElement, useId } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";

export type TooltipSide = "top" | "bottom";

export interface TooltipProps extends Omit<HTMLAttributes<HTMLSpanElement>, "content"> {
  content: ReactNode;
  children?: ReactNode;
  side?: TooltipSide;
}

export function Tooltip({
  children,
  className,
  content,
  side = "top",
  ...props
}: TooltipProps) {
  const tooltipId = useId();

  const trigger = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        "aria-describedby": tooltipId
      })
    : children;

  return (
    <span className={["yza-tooltip", `yza-tooltip--${side}`, className].filter(Boolean).join(" ")} {...props}>
      <span className="yza-tooltip__trigger">{trigger}</span>
      <span className="yza-tooltip__bubble" id={tooltipId} role="tooltip">
        {content}
      </span>
    </span>
  );
}
