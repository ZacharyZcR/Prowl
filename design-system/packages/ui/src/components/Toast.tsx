import type { HTMLAttributes, ReactNode } from "react";

const toneClassMap = {
  info: "yza-toast--info",
  success: "yza-toast--success",
  warning: "yza-toast--warning",
  danger: "yza-toast--danger"
} as const;

export type ToastTone = keyof typeof toneClassMap;

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  description?: ReactNode;
  onClose?: () => void;
  title: ReactNode;
  tone?: ToastTone;
}

export function Toast({
  className,
  description,
  onClose,
  title,
  tone = "info",
  ...props
}: ToastProps) {
  return (
    <div
      className={["yza-toast", toneClassMap[tone], className].filter(Boolean).join(" ")}
      role="status"
      {...props}
    >
      <div className="yza-toast__body">
        <div className="yza-toast__title">{title}</div>
        {description ? <div className="yza-toast__description">{description}</div> : null}
      </div>
      {onClose ? (
        <button
          aria-label="关闭通知"
          className="yza-toast__close"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
