import type { InputHTMLAttributes, ReactNode } from "react";

export type FieldStatus = "default" | "error" | "success";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  message?: string;
  leading?: ReactNode;
  status?: FieldStatus;
}

export function Input({
  className,
  hint,
  id,
  label,
  leading,
  message,
  status = "default",
  ...props
}: InputProps) {
  const describedBy = message ?? hint ? `${id}-help` : undefined;

  return (
    <label className="yza-field" htmlFor={id}>
      {label ? <span className="yza-field__label">{label}</span> : null}
      <span className="yza-input-shell" data-status={status}>
        {leading ? <span className="yza-input-shell__leading">{leading}</span> : null}
        <input
          aria-describedby={describedBy}
          className={["yza-input", className].filter(Boolean).join(" ")}
          id={id}
          {...props}
        />
      </span>
      {hint || message ? (
        <span className="yza-field__message" data-status={status} id={describedBy}>
          {message ?? hint}
        </span>
      ) : null}
    </label>
  );
}
