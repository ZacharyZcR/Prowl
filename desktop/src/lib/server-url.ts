const DEFAULT_SERVER_URL = "http://localhost:38080";

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function normalizeServerUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.replace(/\/+$/, "");
}

export function isValidServerUrl(url: string): boolean {
  const normalized = normalizeServerUrl(url);
  if (!normalized) {
    return false;
  }

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function getDefaultServerUrl(): string {
  return DEFAULT_SERVER_URL;
}

export function getServerUrl(url?: string): string {
  return normalizeServerUrl(url ?? "") || DEFAULT_SERVER_URL;
}

export function buildApiUrl(path: string, serverUrl?: string): string {
  return `${getServerUrl(serverUrl)}${normalizePath(path)}`;
}

export function buildWebSocketUrl(path: string, serverUrl?: string): string {
  const url = new URL(buildApiUrl(path, serverUrl));
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}
