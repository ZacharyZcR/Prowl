import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./auth";

describe("auth store", () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      user: null,
    });
  });

  it("starts unauthenticated", () => {
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
  });

  it("login sets token and user", () => {
    const mockUser = {
      id: 1,
      username: "test",
      email: "test@example.com",
      nickname: "Test",
      created_at: "2025-01-01",
    };
    useAuthStore.getState().login("test-token", mockUser);

    const state = useAuthStore.getState();
    expect(state.token).toBe("test-token");
    expect(state.user?.username).toBe("test");
  });

  it("logout clears state", () => {
    const mockUser = {
      id: 1,
      username: "test",
      email: "",
      nickname: "",
      created_at: "",
    };
    useAuthStore.getState().login("token", mockUser);
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  it("setUser updates user without changing auth state", () => {
    const user1 = {
      id: 1,
      username: "a",
      email: "",
      nickname: "",
      created_at: "",
    };
    const user2 = {
      id: 1,
      username: "b",
      email: "",
      nickname: "",
      created_at: "",
    };
    useAuthStore.getState().login("token", user1);
    useAuthStore.getState().setUser(user2);

    const state = useAuthStore.getState();
    expect(state.user?.username).toBe("b");
    expect(state.token).toBe("token");
  });
});
