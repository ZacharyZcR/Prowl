import type { HTMLAttributes, ReactNode } from "react";

const toneClassMap = {
  neutral: "yza-tag--neutral",
  info: "yza-tag--info",
  success: "yza-tag--success",
  warning: "yza-tag--warning",
  danger: "yza-tag--danger"
} as const;

export type TagTone = keyof typeof toneClassMap;

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  icon?: ReactNode;
  tone?: TagTone;
}

export function Tag({
  children,
  className,
  icon,
  tone = "neutral",
  ...props
}: TagProps) {
  return (
    <span
      className={["yza-tag", toneClassMap[tone], className].filter(Boolean).join(" ")}
      {...props}
    >
      {icon ? <span className="yza-tag__icon">{icon}</span> : null}
      <span>{children}</span>
    </span>
  );
}
