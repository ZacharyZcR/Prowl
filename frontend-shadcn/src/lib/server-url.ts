const DEFAULT_DEV_API_URL = "";

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function normalizeApiUrl(url?: string): string {
  return (url ?? "").trim().replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const fallback = import.meta.env.DEV ? DEFAULT_DEV_API_URL : "";
  return normalizeApiUrl(import.meta.env.VITE_API_URL || fallback);
}

export function buildApiUrl(path: string): string {
  const normalizedPath = normalizePath(path);
  const baseUrl = getApiBaseUrl();
  if (baseUrl) {
    return `${baseUrl}${normalizedPath}`;
  }

  if (typeof window === "undefined") {
    return normalizedPath;
  }

  return new URL(normalizedPath, window.location.origin).toString();
}

export function buildWebSocketUrl(path: string): string {
  const url = new URL(buildApiUrl(path));
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}
