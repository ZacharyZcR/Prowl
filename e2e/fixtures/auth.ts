import { test as base, expect } from "@playwright/test";

const API_BASE = process.env.E2E_API_URL || "http://localhost:38080";

type AuthFixtures = {
  adminToken: string;
  apiRequest: (
    method: string,
    path: string,
    data?: unknown,
    token?: string,
  ) => Promise<unknown>;
};

export const test = base.extend<AuthFixtures>({
  adminToken: async ({ request }, use) => {
    const res = await request.post(`${API_BASE}/api/v1/auth/login`, {
      data: { username: "admin", password: "admin123" },
    });
    const body = await res.json();
    await use(body.data.token);
  },

  apiRequest: async ({ request }, use) => {
    const fn = async (
      method: string,
      path: string,
      data?: unknown,
      token?: string,
    ) => {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await request.fetch(`${API_BASE}${path}`, {
        method,
        data: data ? JSON.stringify(data) : undefined,
        headers: { ...headers, "Content-Type": "application/json" },
      });
      return res.json();
    };
    await use(fn);
  },
});

export { expect };
