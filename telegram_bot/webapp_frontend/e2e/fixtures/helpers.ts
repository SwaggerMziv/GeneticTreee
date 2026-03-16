/**
 * Helper utilities for Playwright E2E tests.
 */

import { Page } from "@playwright/test";

/**
 * Mock the Telegram WebApp SDK and authenticate the page.
 * Injects a fake `window.Telegram.WebApp` object.
 */
export async function setupTelegramAuth(page: Page) {
  await page.addInitScript(() => {
    // Mock Telegram WebApp SDK
    (window as any).Telegram = {
      WebApp: {
        ready: () => {},
        expand: () => {},
        close: () => {},
        colorScheme: "light",
        themeParams: {
          bg_color: "#ffffff",
          text_color: "#000000",
          hint_color: "#999999",
          link_color: "#2481cc",
          button_color: "#2481cc",
          button_text_color: "#ffffff",
        },
        initData: "",
        initDataUnsafe: {
          user: {
            id: 12345,
            first_name: "Тест",
            last_name: "Тестов",
          },
        },
        HapticFeedback: {
          impactOccurred: () => {},
          notificationOccurred: () => {},
          selectionChanged: () => {},
        },
        MainButton: {
          show: () => {},
          hide: () => {},
          setText: () => {},
          onClick: () => {},
          offClick: () => {},
          isVisible: false,
        },
        BackButton: {
          show: () => {},
          hide: () => {},
          onClick: () => {},
          offClick: () => {},
        },
      },
    };
  });
}

/**
 * Navigate to the app and wait for loading to complete.
 */
export async function navigateAndWaitForAuth(page: Page) {
  await page.goto("/");
  // Ждём пока loading spinner исчезнет
  await page.waitForSelector("[class*='animate-spin']", { state: "hidden", timeout: 10_000 }).catch(() => {
    // Если spinner уже ушёл или нет — продолжаем
  });
}
