import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePageBounds } from "./usePageBounds";

describe("usePageBounds", () => {
  it("clamps page when it exceeds total pages", () => {
    const setPage = vi.fn();

    renderHook(() => usePageBounds(5, 2, setPage));

    expect(setPage).toHaveBeenCalledWith(2);
  });

  it("does not update page when already in bounds", () => {
    const setPage = vi.fn();

    renderHook(() => usePageBounds(2, 3, setPage));

    expect(setPage).not.toHaveBeenCalled();
  });
});
