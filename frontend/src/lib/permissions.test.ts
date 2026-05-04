import { describe, it, expect } from "vitest";
import { hasPermission, hasAnyPermission } from "./permissions";

describe("hasPermission", () => {
  it("returns true for exact match", () => {
    expect(hasPermission(["user:read"], "user:read")).toBe(true);
  });

  it("returns false for no match", () => {
    expect(hasPermission(["user:read"], "user:write")).toBe(false);
  });

  it("returns true for wildcard *", () => {
    expect(hasPermission(["*"], "anything")).toBe(true);
  });

  it("returns true for prefix wildcard", () => {
    expect(hasPermission(["project:*"], "project:read")).toBe(true);
    expect(hasPermission(["project:*"], "project:write")).toBe(true);
  });

  it("prefix wildcard does not match other domains", () => {
    expect(hasPermission(["project:*"], "user:read")).toBe(false);
  });

  it("returns false for empty permissions", () => {
    expect(hasPermission([], "user:read")).toBe(false);
  });
});

describe("hasAnyPermission", () => {
  it("returns true if any match", () => {
    expect(
      hasAnyPermission(["user:read"], ["user:read", "user:write"]),
    ).toBe(true);
  });

  it("returns false if none match", () => {
    expect(
      hasAnyPermission(["role:read"], ["user:read", "user:write"]),
    ).toBe(false);
  });
});
