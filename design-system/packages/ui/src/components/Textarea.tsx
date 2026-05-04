import type { TextareaHTMLAttributes } from "react";

import type { FieldStatus } from "./Input";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  message?: string;
  status?: FieldStatus;
}

export function Textarea({
  className,
  hint,
  id,
  label,
  message,
  rows = 5,
  status = "default",
  ...props
}: TextareaProps) {
  const describedBy = message ?? hint ? `${id}-help` : undefined;

  return (
    <label className="yza-field" htmlFor={id}>
      {label ? <span className="yza-field__label">{label}</span> : null}
      <span className="yza-input-shell yza-input-shell--textarea" data-status={status}>
        <textarea
          aria-describedby={describedBy}
          className={["yza-input", "yza-textarea", className].filter(Boolean).join(" ")}
          id={id}
          rows={rows}
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
