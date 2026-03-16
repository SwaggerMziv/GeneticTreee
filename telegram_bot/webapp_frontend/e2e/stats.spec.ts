import { test, expect } from "@playwright/test";
import { setupApiMocks } from "./fixtures/api-mocks";
import { setupTelegramAuth, navigateAndWaitForAuth } from "./fixtures/helpers";

test.describe("Stats", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setupTelegramAuth(page);
    await navigateAndWaitForAuth(page);

    // Переходим на вкладку "Статистика"
    const statsTab = page.getByText("Статистика");
    await statsTab.click();
    await page.waitForTimeout(500);
  });

  test("renders 4 stat cards", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    const myStories = page.getByText("Мои истории");
    const relatives = page.getByText("Связанных родственников");
    const relStories = page.getByText("Историй от родственников");
    const total = page.getByText("Всего историй в архиве");

    await expect(myStories).toBeVisible({ timeout: 5_000 });
    await expect(relatives).toBeVisible();
    await expect(relStories).toBeVisible();
    await expect(total).toBeVisible();
  });

  test("shows correct values", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    // Значения из defaultStats: my_stories=5, related_relatives=3, relatives_stories=8, total_stories=13
    await expect(page.getByText("5")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("3")).toBeVisible();
    await expect(page.getByText("8")).toBeVisible();
    await expect(page.getByText("13")).toBeVisible();
  });

  test("handles stats loading error", async ({ page }) => {
    await page.route("**/webapp/api/stats", (route) => {
      return route.fulfill({ status: 500, json: { detail: "Error" } });
    });

    await page.reload();
    await setupTelegramAuth(page);
    await navigateAndWaitForAuth(page);

    const statsTab = page.getByText("Статистика");
    await statsTab.click();
    await page.waitForTimeout(1000);

    // Страница не должна crash
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("displays stats header", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    const header = page.getByText("Ваш семейный архив");
    await expect(header).toBeVisible({ timeout: 5_000 });
  });
});
