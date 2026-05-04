import { cn } from "@/lib/utils";

export interface SwitchProps {
  id?: string;
  checked: boolean;
  disabled?: boolean;
  label?: string;
  description?: string;
  onChange?: (checked: boolean) => void;
}

export function Switch({ id, checked, disabled, label, description, onChange }: SwitchProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex items-center gap-2 cursor-pointer select-none text-sm text-[var(--stc-text-primary)]",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200",
          checked ? "bg-[var(--stc-brand-600)]" : "bg-[var(--stc-neutral-300)]",
        )}
      >
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200",
            checked ? "translate-x-[18px]" : "translate-x-[3px]",
          )}
        />
      </button>
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span>{label}</span>}
          {description && <span className="text-xs text-[var(--stc-text-tertiary)]">{description}</span>}
        </div>
      )}
    </label>
  );
}
