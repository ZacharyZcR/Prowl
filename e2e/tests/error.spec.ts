import { test, expect } from "@playwright/test";

test.describe("Error Handling", () => {
  test("404 page renders for unknown route", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: "404" })).toBeVisible({
      timeout: 5000,
    });
  });

  test("dashboard loads without page errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    expect(errors).toHaveLength(0);
  });
});
