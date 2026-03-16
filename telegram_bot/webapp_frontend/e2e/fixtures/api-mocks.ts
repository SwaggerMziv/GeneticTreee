/**
 * Mock responses for all WebApp API calls.
 * Used in Playwright E2E tests via page.route().
 */

import { Page } from "@playwright/test";

export interface MockOptions {
  /** Mock auth response override */
  auth?: Partial<typeof defaultAuth>;
  /** Mock stories override */
  stories?: unknown[];
  /** Mock stats override */
  stats?: Partial<typeof defaultStats>;
  /** Mock settings override */
  settings?: Partial<typeof defaultSettings>;
  /** Mock interview history override */
  interviewHistory?: Partial<typeof defaultInterviewHistory>;
}

const defaultAuth = {
  token: "test-jwt-token",
  relative_id: 1,
  telegram_user_id: 12345,
  first_name: "Тест",
  last_name: "Тестов",
  relative_name: "Тест Тестов",
};

const defaultStats = {
  my_stories: 5,
  related_relatives: 3,
  relatives_stories: 8,
  total_stories: 13,
};

const defaultSettings = {
  broadcast_enabled: true,
  name: "Тест Тестов",
  added_at: "2024-01-15T10:00:00",
};

const defaultInterviewHistory = {
  messages: [],
  question_count: 0,
  can_create_story: false,
  relative_name: "Тест Тестов",
};

const defaultStories = [
  {
    key: "childhood",
    title: "Детство в деревне",
    text: "Летом мы всегда ездили к бабушке в деревню...",
    media: [],
    created_at: "2024-06-15T10:00:00",
    updated_at: null,
  },
  {
    key: "school",
    title: "Школьные годы",
    text: "Первый день в школе я запомнил навсегда...",
    media: [{ type: "image", url: "https://mock.s3/photo.jpg" }],
    created_at: "2024-07-20T14:30:00",
    updated_at: null,
  },
];

/**
 * Setup all API route mocks for the page.
 */
export async function setupApiMocks(page: Page, options: MockOptions = {}) {
  const auth = { ...defaultAuth, ...options.auth };
  const stats = { ...defaultStats, ...options.stats };
  const settings = { ...defaultSettings, ...options.settings };
  const history = { ...defaultInterviewHistory, ...options.interviewHistory };
  const stories = options.stories ?? defaultStories;

  // Auth endpoints
  await page.route("**/webapp/api/auth", (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({ json: auth });
    }
    return route.continue();
  });

  await page.route("**/webapp/api/auth/by-telegram-id", (route) => {
    return route.fulfill({ json: auth });
  });

  await page.route("**/webapp/api/auth/health", (route) => {
    return route.fulfill({
      json: {
        bot_token_configured: true,
        backend_url: "http://localhost:8000",
        backend_reachable: true,
      },
    });
  });

  // Interview
  await page.route("**/webapp/api/interview/history", (route) => {
    return route.fulfill({ json: history });
  });

  await page.route("**/webapp/api/interview/confirm-story", (route) => {
    return route.fulfill({ json: { success: true, message: "OK" } });
  });

  await page.route("**/webapp/api/interview/create-relative", (route) => {
    return route.fulfill({
      json: { success: true, message: "Профиль создан!", data: { relative_id: 2 } },
    });
  });

  // Stories
  await page.route("**/webapp/api/stories/count", (route) => {
    return route.fulfill({ json: { count: stories.length } });
  });

  await page.route("**/webapp/api/stories", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: { stories } });
    }
    return route.continue();
  });

  // Stats
  await page.route("**/webapp/api/stats", (route) => {
    return route.fulfill({ json: stats });
  });

  // Settings
  await page.route("**/webapp/api/settings", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: settings });
    }
    if (route.request().method() === "PUT") {
      return route.fulfill({
        json: { success: true, broadcast_enabled: false },
      });
    }
    return route.continue();
  });

  // Transcribe
  await page.route("**/webapp/api/transcribe", (route) => {
    return route.fulfill({ json: { text: "Тестовая транскрипция", success: true } });
  });

  // TTS
  await page.route("**/webapp/api/tts", (route) => {
    return route.fulfill({
      body: Buffer.from("fake-audio"),
      headers: { "Content-Type": "audio/mpeg" },
    });
  });
}
