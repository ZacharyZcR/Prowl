import type { ButtonHTMLAttributes, ReactNode } from "react";

const toneClassMap = {
  primary: "yza-button--primary",
  accent: "yza-button--accent",
  outline: "yza-button--outline",
  neutral: "yza-button--neutral",
  danger: "yza-button--danger",
  success: "yza-button--success"
} as const;

const sizeClassMap = {
  sm: "yza-button--sm",
  md: "yza-button--md",
  lg: "yza-button--lg"
} as const;

export type ButtonTone = keyof typeof toneClassMap;
export type ButtonSize = keyof typeof sizeClassMap;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  tone?: ButtonTone;
  size?: ButtonSize;
}

export function Button({
  children,
  className,
  tone = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  const classes = [
    "yza-button",
    toneClassMap[tone],
    sizeClassMap[size],
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} type={type} {...props}>
      {children}
    </button>
  );
}
