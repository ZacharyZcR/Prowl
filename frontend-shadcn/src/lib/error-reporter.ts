import { api } from "./api";
import { buildApiUrl } from "./server-url";

export function initErrorReporter() {
  window.addEventListener("error", (event) => {
    reportError({
      type: "runtime_error",
      message: event.message,
      stack: event.error?.stack ?? "",
      url: window.location.href,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportError({
      type: "unhandled_rejection",
      message: String(event.reason),
      stack: event.reason?.stack ?? "",
      url: window.location.href,
    });
  });
}

function reportError(data: { type: string; message: string; stack: string; url: string }) {
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const ok = navigator.sendBeacon(
      buildApiUrl("/api/v1/error-logs/report"),
      new Blob([JSON.stringify(data)], { type: "application/json" }),
    );
    if (ok) {
      return;
    }
  }

  api.post("/api/v1/error-logs/report", data).catch(() => {});
}
