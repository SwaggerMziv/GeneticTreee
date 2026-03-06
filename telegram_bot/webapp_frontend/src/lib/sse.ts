/**
 * SSE streaming helper for POST endpoints.
 *
 * Since EventSource only supports GET, we use fetch + ReadableStream
 * to handle SSE from POST endpoints.
 */

import type { SSEEvent } from "./types";
import { getToken } from "./api";

function getBaseUrl(): string {
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return `${window.location.origin}/webapp/api`;
  }
  return "http://localhost:8080/webapp/api";
}

/**
 * Async generator that yields SSE events from a POST endpoint.
 */
export async function* streamSSE(
  path: string,
  body?: Record<string, unknown>
): AsyncGenerator<SSEEvent> {
  const url = `${getBaseUrl()}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`SSE error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from buffer
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            yield data as SSEEvent;
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim().startsWith("data: ")) {
      try {
        const data = JSON.parse(buffer.trim().slice(6));
        yield data as SSEEvent;
      } catch {
        // Skip
      }
    }
  } finally {
    reader.releaseLock();
  }
}
