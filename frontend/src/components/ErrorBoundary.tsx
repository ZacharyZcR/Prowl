import type { ReactNode } from "react";
import {
  ErrorBoundary as ReactErrorBoundary,
  type FallbackProps,
} from "react-error-boundary";
import i18n from "@/i18n";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

function DefaultFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="stc-error-boundary">
      <h2>{i18n.t("common.somethingWentWrong")}</h2>
      <pre className="stc-error-boundary__message">{message}</pre>
      <button
        onClick={resetErrorBoundary}
        className="stc-error-boundary__retry"
        type="button"
      >
        {i18n.t("common.retry")}
      </button>
    </div>
  );
}

function onError(error: unknown, info: React.ErrorInfo) {
  console.error("[ErrorBoundary]", error, info.componentStack);
}

export function ErrorBoundary({ children, fallback }: Props) {
  if (fallback) {
    return (
      <ReactErrorBoundary fallback={fallback} onError={onError}>
        {children}
      </ReactErrorBoundary>
    );
  }

  return (
    <ReactErrorBoundary
      FallbackComponent={DefaultFallback}
      onError={onError}
    >
      {children}
    </ReactErrorBoundary>
  );
}
