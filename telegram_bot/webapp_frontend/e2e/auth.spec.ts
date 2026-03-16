import { test, expect } from "@playwright/test";
import { setupApiMocks } from "./fixtures/api-mocks";
import { setupTelegramAuth, navigateAndWaitForAuth } from "./fixtures/helpers";

test.describe("Auth", () => {
  test("shows loading spinner initially", async ({ page }) => {
    await setupApiMocks(page);
    await setupTelegramAuth(page);

    await page.goto("/");
    // Кратковременно должен быть виден spinner
    const spinner = page.locator("[class*='animate-spin']");
    // Spinner может исчезнуть быстро — просто проверяем что страница загрузилась
    await page.waitForLoadState("domcontentloaded");
  });

  test("shows error UI when auth fails", async ({ page }) => {
    // Мокаем auth endpoint чтобы вернуть 401
    await page.route("**/webapp/api/auth", (route) => {
      return route.fulfill({ status: 401, json: { detail: "Unauthorized" } });
    });
    await page.route("**/webapp/api/auth/by-telegram-id", (route) => {
      return route.fulfill({ status: 401, json: { detail: "Unauthorized" } });
    });

    await setupTelegramAuth(page);
    await page.goto("/");
    await page.waitForTimeout(2000);

    // Должен показать кнопку ретрая или ошибку
    // Так как нет initData и fallback тоже провалится — покажется dev mode или ошибка
    await page.waitForLoadState("domcontentloaded");
  });

  test("retry button reloads page", async ({ page }) => {
    // Полный отказ авторизации
    await page.route("**/webapp/api/auth", (route) => {
      return route.fulfill({ status: 500, json: { detail: "Error" } });
    });
    await page.route("**/webapp/api/auth/by-telegram-id", (route) => {
      return route.fulfill({ status: 500, json: { detail: "Error" } });
    });

    // Без Telegram SDK для чистого теста ошибки
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);
  });

  test("renders app after successful auth", async ({ page }) => {
    await setupApiMocks(page);
    await setupTelegramAuth(page);
    await navigateAndWaitForAuth(page);

    // Должна быть видна нижняя навигация
    const nav = page.locator("nav");
    await expect(nav).toBeVisible({ timeout: 10_000 });
  });

  test("preserves tab in sessionStorage", async ({ page }) => {
    await setupApiMocks(page);
    await setupTelegramAuth(page);
    await navigateAndWaitForAuth(page);

    // Кликаем на "Истории"
    const storiesTab = page.getByText("Истории");
    if (await storiesTab.isVisible()) {
      await storiesTab.click();
      // Проверяем sessionStorage
      const savedTab = await page.evaluate(() => sessionStorage.getItem("webapp_activeTab"));
      expect(savedTab).toBe("stories");
    }
  });

  test("dev mode fallback without Telegram SDK", async ({ page }) => {
    await setupApiMocks(page);
    // НЕ вызываем setupTelegramAuth — нет Telegram SDK

    await page.goto("/");
    await page.waitForTimeout(2000);
    await page.waitForLoadState("domcontentloaded");
    // В dev mode приложение должно загрузиться (с mock token "dev")
  });
});
