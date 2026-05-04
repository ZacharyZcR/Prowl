import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePagination } from "./usePagination";

describe("usePagination", () => {
  it("starts at page 1 with default pageSize", () => {
    const { result } = renderHook(() => usePagination());
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(20);
  });

  it("accepts custom initial values", () => {
    const { result } = renderHook(() => usePagination(2, 50));
    expect(result.current.page).toBe(2);
    expect(result.current.pageSize).toBe(50);
  });

  it("setPage changes page", () => {
    const { result } = renderHook(() => usePagination());
    act(() => {
      result.current.setPage(3);
    });
    expect(result.current.page).toBe(3);
  });

  it("setPageSize changes pageSize", () => {
    const { result } = renderHook(() => usePagination());
    act(() => {
      result.current.setPageSize(50);
    });
    expect(result.current.pageSize).toBe(50);
  });

  it("reset goes back to 1", () => {
    const { result } = renderHook(() => usePagination());
    act(() => {
      result.current.setPage(5);
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.page).toBe(1);
  });
});
