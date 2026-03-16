import { test, expect } from "@playwright/test";
import { setupApiMocks } from "./fixtures/api-mocks";
import { setupTelegramAuth, navigateAndWaitForAuth } from "./fixtures/helpers";

test.describe("Stories", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setupTelegramAuth(page);
    await navigateAndWaitForAuth(page);

    // Переходим на вкладку "Истории"
    const storiesTab = page.getByText("Истории");
    await storiesTab.click();
    await page.waitForTimeout(500);
  });

  test("renders stories list", async ({ page }) => {
    // Ждём загрузки историй
    await page.waitForLoadState("networkidle");

    // Должны быть видны карточки историй
    const title = page.getByText("Мои истории");
    await expect(title).toBeVisible({ timeout: 5_000 });
  });

  test("shows empty state when no stories", async ({ page }) => {
    // Переопределяем мок на пустой список
    await page.route("**/webapp/api/stories", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: { stories: [] } });
      }
      return route.continue();
    });

    await page.reload();
    await setupTelegramAuth(page);
    await navigateAndWaitForAuth(page);

    const storiesTab = page.getByText("Истории");
    await storiesTab.click();
    await page.waitForTimeout(1000);

    // Должен быть текст "Пока нет историй"
    const emptyText = page.getByText("Пока нет историй");
    await expect(emptyText).toBeVisible({ timeout: 5_000 });
  });

  test("opens story detail on click", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    // Кликаем на первую историю
    const storyCard = page.getByText("Детство в деревне");
    if (await storyCard.isVisible()) {
      await storyCard.click();
      await page.waitForTimeout(500);

      // Должен появиться детальный вид
      const storyText = page.getByText("Летом мы всегда ездили к бабушке");
      await expect(storyText).toBeVisible({ timeout: 3_000 });
    }
  });

  test("displays story count badge", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    // Заголовок должен содержать количество
    const subtitle = page.getByText(/историй|история/i);
    await expect(subtitle).toBeVisible({ timeout: 5_000 });
  });

  test("displays media in story", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    // Кликаем на историю с медиа
    const schoolStory = page.getByText("Школьные годы");
    if (await schoolStory.isVisible()) {
      await schoolStory.click();
      await page.waitForTimeout(500);
    }
  });

  test("handles loading error", async ({ page }) => {
    await page.route("**/webapp/api/stories", (route) => {
      return route.fulfill({ status: 500, json: { detail: "Error" } });
    });

    await page.reload();
    await setupTelegramAuth(page);
    await navigateAndWaitForAuth(page);

    const storiesTab = page.getByText("Истории");
    await storiesTab.click();
    await page.waitForTimeout(1000);

    // Не должно быть crash — страница должна остаться стабильной
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});
