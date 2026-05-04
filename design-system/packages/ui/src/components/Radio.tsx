import type { InputHTMLAttributes } from "react";

export interface RadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "children" | "type"> {
  label: string;
  description?: string;
}

export function Radio({
  checked,
  className,
  description,
  disabled,
  id,
  label,
  ...props
}: RadioProps) {
  return (
    <label
      className={["yza-choice", className].filter(Boolean).join(" ")}
      data-disabled={disabled ? "true" : "false"}
      htmlFor={id}
    >
      <span className="yza-choice__control-wrap">
        <input
          checked={checked}
          className="yza-choice__input"
          disabled={disabled}
          id={id}
          type="radio"
          {...props}
        />
        <span aria-hidden="true" className="yza-choice__control yza-choice__control--radio" />
      </span>
      <span className="yza-choice__content">
        <span className="yza-choice__label">{label}</span>
        {description ? <span className="yza-choice__description">{description}</span> : null}
      </span>
    </label>
  );
}
