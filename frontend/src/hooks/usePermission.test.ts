import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePermission } from "./usePermission";
import { useAuthStore } from "@/stores/auth";

describe("usePermission", () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: "t",
      user: {
        id: 1,
        username: "admin",
        email: "",
        nickname: "",
        created_at: "",
        role: {
          id: 1,
          name: "admin",
          description: "",
          permissions: ["*"],
          user_count: 0,
          created_at: "",
        },
      },
    });
  });

  it("admin can do anything", () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.can("user:read")).toBe(true);
    expect(result.current.can("project:write")).toBe(true);
    expect(result.current.isAdmin).toBe(true);
  });

  it("limited role can only access granted permissions", () => {
    useAuthStore.setState({
      token: "t",
      user: {
        id: 2,
        username: "viewer",
        email: "",
        nickname: "",
        created_at: "",
        role: {
          id: 3,
          name: "viewer",
          description: "",
          permissions: ["user:read", "project:read"],
          user_count: 0,
          created_at: "",
        },
      },
    });
    const { result } = renderHook(() => usePermission());
    expect(result.current.can("user:read")).toBe(true);
    expect(result.current.can("user:write")).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });

  it("canAny returns true if any permission matches", () => {
    useAuthStore.setState({
      token: "t",
      user: {
        id: 2,
        username: "editor",
        email: "",
        nickname: "",
        created_at: "",
        role: {
          id: 2,
          name: "editor",
          description: "",
          permissions: ["project:write"],
          user_count: 0,
          created_at: "",
        },
      },
    });
    const { result } = renderHook(() => usePermission());
    expect(result.current.canAny(["project:write", "user:delete"])).toBe(true);
    expect(result.current.canAny(["user:delete", "role:write"])).toBe(false);
  });

  it("no role returns no permissions", () => {
    useAuthStore.setState({
      token: "t",
      user: {
        id: 3,
        username: "norole",
        email: "",
        nickname: "",
        created_at: "",
      },
    });
    const { result } = renderHook(() => usePermission());
    expect(result.current.can("user:read")).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });
});
