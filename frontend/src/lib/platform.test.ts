import { afterEach, describe, expect, it } from "vitest";
import { getPrimaryModifierLabel, hasPrimaryModifier, isApplePlatform } from "./platform";

const originalPlatform = navigator.platform;

function setPlatform(value: string) {
  Object.defineProperty(navigator, "platform", {
    configurable: true,
    value,
  });
}

afterEach(() => {
  setPlatform(originalPlatform);
});

describe("platform helpers", () => {
  it("detects apple platforms", () => {
    setPlatform("MacIntel");
    expect(isApplePlatform()).toBe(true);
    expect(getPrimaryModifierLabel()).toBe("\u2318");
    expect(hasPrimaryModifier({ metaKey: true, ctrlKey: false })).toBe(true);
  });

  it("detects non-apple platforms", () => {
    setPlatform("Win32");
    expect(isApplePlatform()).toBe(false);
    expect(getPrimaryModifierLabel()).toBe("Ctrl");
    expect(hasPrimaryModifier({ metaKey: true, ctrlKey: false })).toBe(false);
    expect(hasPrimaryModifier({ metaKey: false, ctrlKey: true })).toBe(true);
  });
});
