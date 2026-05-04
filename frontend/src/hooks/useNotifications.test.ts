import { createElement } from "react";
import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNotificationStore } from "@/stores/notification";
import type { PaginatedResponse } from "@/types";
import type { Notification } from "@/types/realtime";

const { put } = vi.hoisted(() => ({
  put: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: { put },
}));

import { useMarkAllRead, useMarkRead } from "./useNotifications";

function createWrapper(client: QueryClient) {
  return function Wrapper(props: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, props.children);
  };
}

function seedNotifications(client: QueryClient, items: Notification[]) {
  client.setQueryData<PaginatedResponse<Notification>>(["notifications", { page: 1 }], {
    items,
    total: items.length,
    page: 1,
    page_size: 20,
    total_pages: 1,
  });
  client.setQueryData(["unread-count"], {
    count: items.filter((item) => !item.read).length,
  });
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("notification mutations", () => {
  beforeEach(() => {
    put.mockReset();
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      drawerOpen: false,
    });
  });

  it("optimistically marks one notification as read and rolls back on failure", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    seedNotifications(client, [
      { id: 1, title: "A", content: "A", type: "info", read: false, created_at: "2026-04-04T12:00:00Z" },
      { id: 2, title: "B", content: "B", type: "info", read: false, created_at: "2026-04-04T12:01:00Z" },
    ]);

    const request = deferred<unknown>();
    put.mockReturnValueOnce(request.promise);

    const { result } = renderHook(() => useMarkRead(), { wrapper: createWrapper(client) });

    act(() => {
      result.current.mutate(1);
    });

    await waitFor(() => {
      const optimistic = client.getQueryData<PaginatedResponse<Notification>>(["notifications", { page: 1 }]);
      expect(optimistic?.items[0].read).toBe(true);
      expect(client.getQueryData<{ count: number }>(["unread-count"])?.count).toBe(1);
    });

    act(() => {
      request.reject(new Error("boom"));
    });

    await waitFor(() => {
      const restored = client.getQueryData<PaginatedResponse<Notification>>(["notifications", { page: 1 }]);
      expect(restored?.items[0].read).toBe(false);
      expect(client.getQueryData<{ count: number }>(["unread-count"])?.count).toBe(2);
    });
  });

  it("optimistically marks all notifications as read", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    seedNotifications(client, [
      { id: 1, title: "A", content: "A", type: "info", read: false, created_at: "2026-04-04T12:00:00Z" },
      { id: 2, title: "B", content: "B", type: "warning", read: false, created_at: "2026-04-04T12:01:00Z" },
    ]);

    put.mockResolvedValueOnce({});

    const { result } = renderHook(() => useMarkAllRead(), { wrapper: createWrapper(client) });

    await act(async () => {
      await result.current.mutateAsync();
    });

    const updated = client.getQueryData<PaginatedResponse<Notification>>(["notifications", { page: 1 }]);
    expect(updated?.items.every((item) => item.read)).toBe(true);
    expect(client.getQueryData<{ count: number }>(["unread-count"])?.count).toBe(0);
  });
});
