import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "./useDebounce";

describe("useDebounce", () => {
  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 300));
    expect(result.current).toBe("hello");
  });

  it("debounces value changes", async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "ab" });
    expect(result.current).toBe("a");

    await act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("ab");

    vi.useRealTimers();
  });

  it("resets timer on rapid changes", async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "ab" });
    await act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ value: "abc" });
    await act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe("a"); // still debouncing

    await act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("abc");

    vi.useRealTimers();
  });
});
