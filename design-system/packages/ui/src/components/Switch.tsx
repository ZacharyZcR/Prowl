import type { InputHTMLAttributes } from "react";

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "children" | "type"> {
  label: string;
  description?: string;
}

export function Switch({
  checked,
  className,
  description,
  disabled,
  id,
  label,
  ...props
}: SwitchProps) {
  return (
    <label
      className={["yza-switch", className].filter(Boolean).join(" ")}
      data-disabled={disabled ? "true" : "false"}
      htmlFor={id}
    >
      <span className="yza-switch__control">
        <input
          checked={checked}
          className="yza-switch__input"
          disabled={disabled}
          id={id}
          type="checkbox"
          {...props}
        />
        <span aria-hidden="true" className="yza-switch__track">
          <span className="yza-switch__thumb" />
        </span>
      </span>
      <span className="yza-switch__content">
        <span className="yza-switch__label">{label}</span>
        {description ? <span className="yza-switch__description">{description}</span> : null}
      </span>
    </label>
  );
}
