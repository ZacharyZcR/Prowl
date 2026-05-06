import { test as setup, expect } from "@playwright/test";

const API_BASE = process.env.E2E_API_URL || "http://localhost:38080";

setup("authenticate as admin", async ({ request }) => {
  const response = await request.post(`${API_BASE}/api/v1/auth/login`, {
    data: { username: "admin", password: "admin123" },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.code).toBe(0);
  expect(body.data.token).toBeTruthy();

  const token = body.data.token;
  const user = body.data.user;

  const fs = await import("node:fs");
  fs.writeFileSync(
    "./auth-state.json",
    JSON.stringify({
      cookies: [],
      origins: [
        {
          origin: process.env.E2E_BASE_URL || "http://localhost:5174",
          localStorage: [
            {
              name: "auth-storage",
              value: JSON.stringify({
                state: { token, user },
                version: 0,
              }),
            },
          ],
        },
      ],
    }),
  );
});
