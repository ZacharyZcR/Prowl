import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "./useMediaQuery";

type Listener = (event: MediaQueryListEvent) => void;

function mockMatchMedia(matches = false) {
  const listeners = new Set<Listener>();
  let current = matches;

  const mediaQueryList = {
    matches: current,
    media: "(max-width: 960px)",
    addEventListener: vi.fn((type: string, listener: Listener) => {
      if (type === "change") {
        listeners.add(listener);
      }
    }),
    removeEventListener: vi.fn((type: string, listener: Listener) => {
      if (type === "change") {
        listeners.delete(listener);
      }
    }),
    dispatch(next: boolean) {
      current = next;
      mediaQueryList.matches = next;
      const event = { matches: next, media: mediaQueryList.media } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };

  vi.stubGlobal("matchMedia", vi.fn(() => mediaQueryList));

  return mediaQueryList;
}

describe("useMediaQuery", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the current media query match", () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => useMediaQuery("(max-width: 960px)"));

    expect(result.current).toBe(true);
  });

  it("reacts to media query changes", () => {
    const media = mockMatchMedia(false);

    const { result } = renderHook(() => useMediaQuery("(max-width: 960px)"));
    expect(result.current).toBe(false);

    act(() => {
      media.dispatch(true);
    });
    expect(result.current).toBe(true);
  });
});
