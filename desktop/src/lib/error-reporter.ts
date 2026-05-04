import { api } from "./api";

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
  api.post("/api/v1/error-logs/report", data).catch(() => {});
}
