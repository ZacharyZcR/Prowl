import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login with valid credentials redirects to dashboard", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();

    await page.goto("/login");
    const usernameInput = page.locator("input").first();
    await expect(usernameInput).toBeVisible({ timeout: 10000 });
    await usernameInput.fill("admin");

    await page.locator('input[type="password"]').fill("admin123");
    await page.getByRole("button", { name: /登录|login/i }).click();

    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
    await context.close();
  });

  test("login with wrong password stays on login page", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();

    await page.goto("/login");
    const usernameInput = page.locator("input").first();
    await expect(usernameInput).toBeVisible({ timeout: 10000 });
    await usernameInput.fill("admin");

    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.getByRole("button", { name: /登录|login/i }).click();

    await expect(page).toHaveURL(/login/, { timeout: 10000 });
    await context.close();
  });

  test("logout button is visible on dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("button", { name: /退出登录|logout/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test("unauthenticated access redirects to login", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();

    await page.goto("/users");
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
    await context.close();
  });
});
