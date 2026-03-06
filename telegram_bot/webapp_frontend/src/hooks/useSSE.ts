"use client";

import { useCallback, useRef, useState } from "react";
import { streamSSE } from "@/lib/sse";
import type { SSEEvent } from "@/lib/types";

export function useSSE() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef(false);

  const stream = useCallback(
    async (
      path: string,
      body: Record<string, unknown> | undefined,
      onEvent: (event: SSEEvent) => void
    ) => {
      setIsStreaming(true);
      abortRef.current = false;

      try {
        for await (const event of streamSSE(path, body)) {
          if (abortRef.current) break;
          onEvent(event);
        }
      } catch (error) {
        onEvent({
          type: "error",
          content:
            error instanceof Error
              ? error.message
              : "Ошибка соединения",
        });
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { stream, isStreaming, abort };
}
