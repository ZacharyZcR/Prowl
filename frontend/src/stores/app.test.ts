import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "./app";

describe("app store", () => {
  beforeEach(() => {
    useAppStore.setState({ sidebarCollapsed: false, theme: "system" });
  });

  it("toggleSidebar flips state", () => {
    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().sidebarCollapsed).toBe(true);
    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().sidebarCollapsed).toBe(false);
  });

  it("setTheme updates theme", () => {
    useAppStore.getState().setTheme("dark");
    expect(useAppStore.getState().theme).toBe("dark");
  });

  it("setTheme to light", () => {
    useAppStore.getState().setTheme("light");
    expect(useAppStore.getState().theme).toBe("light");
  });
});
