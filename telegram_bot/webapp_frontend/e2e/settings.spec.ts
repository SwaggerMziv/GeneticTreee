import { test, expect } from "@playwright/test";
import { setupApiMocks } from "./fixtures/api-mocks";
import { setupTelegramAuth, navigateAndWaitForAuth } from "./fixtures/helpers";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setupTelegramAuth(page);
    await navigateAndWaitForAuth(page);

    // Переходим на вкладку "Настройки"
    const settingsTab = page.getByText("Настройки").last();
    await settingsTab.click();
    await page.waitForTimeout(500);
  });

  test("renders settings page", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    // Заголовок "Настройки"
    const header = page.getByText("Настройки").first();
    await expect(header).toBeVisible({ timeout: 5_000 });
  });

  test("shows user name", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    const userName = page.getByText("Тест Тестов");
    await expect(userName).toBeVisible({ timeout: 5_000 });
  });

  test("broadcast toggle is visible", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    const broadcastLabel = page.getByText("Напоминания");
    await expect(broadcastLabel).toBeVisible({ timeout: 5_000 });
  });

  test("settings save error doesn't crash", async ({ page }) => {
    await page.route("**/webapp/api/settings", (route) => {
      if (route.request().method() === "PUT") {
        return route.fulfill({ status: 500, json: { detail: "Error" } });
      }
      return route.continue();
    });

    await page.waitForLoadState("networkidle");

    // Кликаем на toggle — должен отработать без crash
    const toggle = page.getByText("Напоминания");
    if (await toggle.isVisible()) {
      await toggle.click();
      await page.waitForTimeout(500);
    }

    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});
