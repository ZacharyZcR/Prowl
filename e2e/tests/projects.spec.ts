import { test, expect } from "@playwright/test";

const API_BASE = process.env.E2E_API_URL || "http://localhost:38080";

test.describe("Project Management", () => {
  test("create project via API and verify in list", async ({ page, request }) => {
    const loginRes = await request.post(`${API_BASE}/api/v1/auth/login`, {
      data: { username: "admin", password: "admin123" },
    });
    const loginBody = await loginRes.json();
    const token = loginBody.data.token;

    const createRes = await request.post(`${API_BASE}/api/v1/projects`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      data: { name: "E2E API Project", description: "Created via API", status: "active" },
    });
    const createBody = await createRes.json();
    expect(createBody.code).toBe(0);

    const projectId = createBody.data.id;

    await page.goto("/projects");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText("E2E API Project")).toBeVisible({ timeout: 10000 });

    await request.delete(`${API_BASE}/api/v1/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  test("project list loads and shows table", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("table").first()).toBeVisible({ timeout: 10000 });
  });
});
