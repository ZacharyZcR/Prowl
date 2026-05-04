import { beforeEach, describe, expect, it, vi } from "vitest";

const { put, get, toastError } = vi.hoisted(() => ({
  put: vi.fn(),
  get: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    put,
    get,
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastError,
  },
}));

import { usePreferenceStore } from "./preferences";

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("preference store", () => {
  beforeEach(() => {
    put.mockReset();
    get.mockReset();
    toastError.mockReset();
    usePreferenceStore.setState({ prefs: {}, loaded: false });
  });

  it("keeps optimistic updates when persistence succeeds", async () => {
    put.mockResolvedValueOnce({});

    usePreferenceStore.getState().set("theme", "dark");
    await flushMicrotasks();

    expect(usePreferenceStore.getState().prefs.theme).toBe("dark");
    expect(toastError).not.toHaveBeenCalled();
  });

  it("rolls back optimistic updates when persistence fails", async () => {
    put.mockRejectedValueOnce(new Error("boom"));

    usePreferenceStore.getState().set("theme", "dark");
    expect(usePreferenceStore.getState().prefs.theme).toBe("dark");

    await flushMicrotasks();

    expect(usePreferenceStore.getState().prefs.theme).toBeUndefined();
    expect(toastError).toHaveBeenCalledTimes(1);
  });
});
