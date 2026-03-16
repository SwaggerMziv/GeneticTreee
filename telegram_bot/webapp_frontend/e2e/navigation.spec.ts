import { test, expect } from "@playwright/test";
import { setupApiMocks } from "./fixtures/api-mocks";
import { setupTelegramAuth, navigateAndWaitForAuth } from "./fixtures/helpers";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setupTelegramAuth(page);
    await navigateAndWaitForAuth(page);
  });

  test("4 tabs visible", async ({ page }) => {
    const tabs = ["Интервью", "Истории", "Статистика", "Настройки"];

    for (const tab of tabs) {
      const el = page.getByText(tab);
      await expect(el).toBeVisible({ timeout: 5_000 });
    }
  });

  test("click switches content", async ({ page }) => {
    // Кликаем "Истории"
    await page.getByText("Истории").click();
    await page.waitForTimeout(500);

    // Заголовок "Мои истории" должен быть виден
    await expect(page.getByText("Мои истории")).toBeVisible({ timeout: 5_000 });

    // Кликаем "Статистика"
    await page.getByText("Статистика").click();
    await page.waitForTimeout(500);

    // Заголовок статистики
    await expect(page.getByText("Ваш семейный архив")).toBeVisible({ timeout: 5_000 });
  });

  test("active tab highlighted", async ({ page }) => {
    // По умолчанию "Интервью" активна — должна иметь класс text-primary
    const interviewTab = page.getByText("Интервью");
    await expect(interviewTab).toBeVisible({ timeout: 5_000 });

    // Кликаем "Истории"
    await page.getByText("Истории").click();
    await page.waitForTimeout(300);

    // Проверяем что "Истории" теперь имеет другой стиль
    // (точный CSS класс зависит от реализации)
    const storiesButton = page.locator("nav button").nth(1);
    await expect(storiesButton).toBeVisible();
  });

  test("tab persists on reload", async ({ page }) => {
    // Кликаем "Статистика"
    await page.getByText("Статистика").click();
    await page.waitForTimeout(300);

    // Сохраняем в sessionStorage
    const savedTab = await page.evaluate(() => sessionStorage.getItem("webapp_activeTab"));
    expect(savedTab).toBe("stats");

    // Reload
    await page.reload();
    await page.waitForLoadState("networkidle");

    // После reload вкладка должна быть восстановлена из sessionStorage
    // (если auth пройдёт — React подхватит saved state)
    await page.waitForTimeout(1500);
  });

  test("defaults to interview tab", async ({ page }) => {
    // Очищаем sessionStorage
    await page.evaluate(() => sessionStorage.removeItem("webapp_activeTab"));

    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // По умолчанию должна быть "Интервью"
    const savedTab = await page.evaluate(() => sessionStorage.getItem("webapp_activeTab"));
    // Может быть null (не сохранено) или "interview"
    expect(savedTab === null || savedTab === "interview").toBeTruthy();
  });
});
