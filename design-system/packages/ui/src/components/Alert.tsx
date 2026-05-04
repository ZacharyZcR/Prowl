import type { HTMLAttributes, ReactNode } from "react";

const toneClassMap = {
  info: "yza-alert--info",
  success: "yza-alert--success",
  warning: "yza-alert--warning",
  danger: "yza-alert--danger"
} as const;

export type AlertTone = keyof typeof toneClassMap;

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  description?: ReactNode;
  heading: ReactNode;
  icon?: ReactNode;
  tone?: AlertTone;
}

export function Alert({
  className,
  description,
  heading,
  icon,
  tone = "info",
  ...props
}: AlertProps) {
  return (
    <div
      className={["yza-alert", toneClassMap[tone], className].filter(Boolean).join(" ")}
      role="status"
      {...props}
    >
      {icon ? <div className="yza-alert__icon">{icon}</div> : null}
      <div className="yza-alert__body">
        <div className="yza-alert__title">{heading}</div>
        {description ? <div className="yza-alert__description">{description}</div> : null}
      </div>
    </div>
  );
}
