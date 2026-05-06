import { test, expect } from "@playwright/test";

const API_BASE = process.env.E2E_API_URL || "http://localhost:38080";

async function getAdminToken(request: import("@playwright/test").APIRequestContext) {
  const res = await request.post(`${API_BASE}/api/v1/auth/login`, {
    data: { username: "admin", password: "admin123" },
  });
  const body = await res.json();
  return body.data.token as string;
}

test.describe("User Management", () => {
  test("user list shows users with correct columns", async ({ page }) => {
    await page.goto("/users");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("table").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("用户名")).toBeVisible();
    await expect(page.getByText("邮箱")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "角色" })).toBeVisible();
  });

  test("search filters user list", async ({ page }) => {
    await page.goto("/users");
    await page.waitForLoadState("domcontentloaded");

    const searchInput = page.getByPlaceholder(/搜索|查找|search/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    await searchInput.fill("admin");
    await expect(page.getByText("admin").first()).toBeVisible({ timeout: 10000 });
  });

  test("user data displays correctly via API seed", async ({ page, request }) => {
    const token = await getAdminToken(request);
    const suffix = Date.now();

    const createRes = await request.post(`${API_BASE}/api/v1/users`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      data: {
        username: `e2e_verify_${suffix}`,
        password: "test123456",
        email: `verify_${suffix}@test.local`,
        role_id: 1,
      },
    });
    const createBody = await createRes.json();
    const userId = createBody.data?.id;

    await page.goto("/users");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(`e2e_verify_${suffix}`)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(`verify_${suffix}@test.local`)).toBeVisible();

    if (userId) {
      await request.delete(`${API_BASE}/api/v1/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});
