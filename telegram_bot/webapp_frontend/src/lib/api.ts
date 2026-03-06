/**
 * API client for WebApp backend.
 * Uses fetch (not axios) for minimal bundle size.
 */

import type {
  AuthResponse,
  InterviewHistory,
  Settings,
  Stats,
  Story,
} from "./types";

const TOKEN_STORAGE_KEY = "webapp_auth_token";

let _token: string | null = (() => {
  // Восстанавливаем токен из sessionStorage при загрузке модуля
  if (typeof window !== "undefined") {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  }
  return null;
})();
let _onAuthRequired: (() => Promise<void>) | null = null;

/**
 * Base URL — relative since Next.js static is served by same FastAPI.
 * In dev mode, proxy via next.config.js or use absolute URL.
 */
function getBaseUrl(): string {
  // In production, static is served from the same origin
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return `${window.location.origin}/webapp/api`;
  }
  // Dev: proxy to local FastAPI
  return "http://localhost:8080/webapp/api";
}

/** Expose base URL for diagnostics */
export function getApiBaseUrl(): string {
  return getBaseUrl();
}

export function setToken(token: string) {
  _token = token;
  if (typeof window !== "undefined") {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}

export function getToken(): string | null {
  return _token;
}

export function clearToken() {
  _token = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function setOnAuthRequired(fn: () => Promise<void>) {
  _onAuthRequired = fn;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (_token) {
    headers["Authorization"] = `Bearer ${_token}`;
  }

  // Don't set Content-Type for FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && _onAuthRequired && !path.startsWith("/auth")) {
    await _onAuthRequired();
    // Retry once after re-auth
    const retryHeaders = { ...headers };
    if (_token) {
      retryHeaders["Authorization"] = `Bearer ${_token}`;
    }
    const retry = await fetch(url, { ...options, headers: retryHeaders });
    if (!retry.ok) throw new Error(`API error: ${retry.status}`);
    return retry.json();
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error: ${response.status} ${text}`);
  }

  return response.json();
}

// ── Auth ──

export async function authenticate(initData: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/auth", {
    method: "POST",
    body: JSON.stringify({ init_data: initData }),
  });
  setToken(data.token);
  return data;
}

/**
 * Fallback-авторизация по telegram_user_id.
 * Используется когда initData недоступна, но SDK предоставляет user.id.
 */
export async function authenticateByTelegramId(
  telegramUserId: number
): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/auth/by-telegram-id", {
    method: "POST",
    body: JSON.stringify({ telegram_user_id: telegramUserId }),
  });
  setToken(data.token);
  return data;
}

// ── Interview ──

export async function getInterviewHistory(): Promise<InterviewHistory> {
  return request<InterviewHistory>("/interview/history");
}

export async function confirmStory(
  action: "save" | "discard" | "continue"
): Promise<{ success: boolean; message: string; story_key?: string }> {
  return request("/interview/confirm-story", {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

export async function createRelative(data: {
  first_name: string;
  last_name?: string;
  birth_year?: number;
  gender: string;
  relationship_type: string;
}): Promise<{ success: boolean; message: string }> {
  return request("/interview/create-relative", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Stories ──

export async function getStories(): Promise<{ stories: Story[] }> {
  return request("/stories");
}

export async function getStoriesCount(): Promise<{ count: number }> {
  return request("/stories/count");
}

export async function uploadStoryMedia(
  storyKey: string,
  file: File
): Promise<unknown> {
  const formData = new FormData();
  formData.append("file", file);
  return request(`/stories/${encodeURIComponent(storyKey)}/media`, {
    method: "POST",
    body: formData,
  });
}

// ── Transcribe ──

export async function transcribeVoice(
  audioBlob: Blob
): Promise<{ text: string; success: boolean }> {
  const formData = new FormData();
  formData.append("file", audioBlob, "voice.webm");
  return request("/transcribe", {
    method: "POST",
    body: formData,
  });
}

// ── TTS ──

export async function synthesizeSpeech(
  text: string,
  voice?: string
): Promise<ArrayBuffer> {
  const url = `${getBaseUrl()}/tts`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (_token) {
    headers["Authorization"] = `Bearer ${_token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ text, voice }),
  });

  if (!response.ok) {
    throw new Error(`TTS error: ${response.status}`);
  }

  return response.arrayBuffer();
}

// ── Stats ──

export async function getStats(): Promise<Stats> {
  return request("/stats");
}

// ── Settings ──

export async function getSettings(): Promise<Settings> {
  return request("/settings");
}

export async function updateSettings(data: {
  broadcast_enabled: boolean;
}): Promise<{ success: boolean }> {
  return request("/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
