import type { ReactNode, SelectHTMLAttributes } from "react";

import type { FieldStatus } from "./Input";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  message?: string;
  leading?: ReactNode;
  status?: FieldStatus;
}

export function Select({
  children,
  className,
  hint,
  id,
  label,
  leading,
  message,
  status = "default",
  ...props
}: SelectProps) {
  const describedBy = message ?? hint ? `${id}-help` : undefined;

  return (
    <label className="yza-field" htmlFor={id}>
      {label ? <span className="yza-field__label">{label}</span> : null}
      <span className="yza-input-shell" data-status={status}>
        {leading ? <span className="yza-input-shell__leading">{leading}</span> : null}
        <select
          aria-describedby={describedBy}
          className={["yza-input", "yza-select", className].filter(Boolean).join(" ")}
          id={id}
          {...props}
        >
          {children}
        </select>
      </span>
      {hint || message ? (
        <span className="yza-field__message" data-status={status} id={describedBy}>
          {message ?? hint}
        </span>
      ) : null}
    </label>
  );
}
