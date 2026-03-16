"use client";

import { useEffect, useRef, useState } from "react";

interface StreamingSubtitlesProps {
  userTranscript: string;
  aiTranscript: string;
  phase: "idle" | "connecting" | "listening" | "speaking";
}

/** Fade-out таймер после окончания ответа AI (мс) */
const FADE_DELAY = 5000;

/**
 * Real-time streaming subtitles for Realtime API.
 *
 * Two layers:
 * - User transcript (small, gray, top) — appears during "listening"
 * - AI transcript (large, white, center) — streams during "speaking"
 *
 * Text arrives incrementally via deltas. No word-reveal timer needed.
 * Fade-out after FADE_DELAY ms of idle.
 */
export function StreamingSubtitles({
  userTranscript,
  aiTranscript,
  phase,
}: StreamingSubtitlesProps) {
  const [visible, setVisible] = useState(true);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll as text streams
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [aiTranscript, userTranscript]);

  // Fade management
  useEffect(() => {
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }

    if (phase === "idle" && (aiTranscript || userTranscript)) {
      // Schedule fade
      setVisible(true);
      fadeTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, FADE_DELAY);
    } else {
      setVisible(true);
    }

    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [phase, aiTranscript, userTranscript]);

  const hasContent = userTranscript || aiTranscript;

  if (!hasContent && phase !== "listening" && phase !== "speaking") {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`flex w-full flex-col items-center gap-2 overflow-hidden px-4 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* User transcript — small, gray */}
      {userTranscript && (
        <div className="max-h-[3rem] w-full overflow-y-auto">
          <p className="animate-subtitle-in text-center text-xs leading-snug text-white/50">
            {userTranscript}
          </p>
        </div>
      )}

      {/* AI transcript — larger, white, streaming */}
      {aiTranscript && (
        <div className="max-h-[30vh] w-full overflow-y-auto">
          <p className="text-center text-[15px] leading-relaxed text-white/90">
            {aiTranscript}
          </p>
        </div>
      )}

      {/* Listening indicator without transcript */}
      {phase === "listening" && !userTranscript && (
        <div className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-400/70"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-400/70"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-400/70"
            style={{ animationDelay: "300ms" }}
          />
          <span className="ml-1 text-sm text-white/50">Слушаю...</span>
        </div>
      )}

      {/* Speaking indicator without transcript yet */}
      {phase === "speaking" && !aiTranscript && (
        <div className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      )}
    </div>
  );
}
