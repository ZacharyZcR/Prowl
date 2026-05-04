import { buildApiUrl, buildWebSocketUrl } from "@/lib/server-url";

export function buildEventSourceUrl(path: string, token: string, serverUrl?: string): string {
  const url = new URL(buildApiUrl(path, serverUrl));
  url.searchParams.set("token", token);
  return url.toString();
}

export { buildApiUrl, buildWebSocketUrl };
