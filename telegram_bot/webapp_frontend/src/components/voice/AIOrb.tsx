"use client";

import { forwardRef } from "react";
import { Mic, Square, Loader2, SkipForward } from "lucide-react";

type Phase = "idle" | "listening" | "processing" | "speaking";

interface AIOrbProps {
  phase: Phase;
  disabled?: boolean;
  onTap: () => void;
}

/**
 * Animated, audio-reactive AI orb.
 * - idle: gentle breathing + pulsing ring hint
 * - listening: reactive to --audio-level (mic), red tint
 * - processing: slow rotation + shimmer
 * - speaking: reactive to --audio-level (TTS), bright glow
 *
 * Tap = start/stop recording, or stop playback.
 * CSS custom property --audio-level is set externally via useAudioReactive.
 */
export const AIOrb = forwardRef<HTMLDivElement, AIOrbProps>(
  function AIOrb({ phase, disabled, onTap }, ref) {
    const phaseClass =
      phase === "idle"
        ? "orb-idle"
        : phase === "processing"
          ? "orb-processing"
          : "orb-reactive";

    const glowColor =
      phase === "listening"
        ? "shadow-[0_0_30px_hsl(0_70%_55%/0.35),0_0_60px_hsl(0_70%_55%/0.15)]"
        : "shadow-orb-glow";

    return (
      <button
        onClick={onTap}
        disabled={disabled}
        className={`relative flex items-center justify-center focus:outline-none ${
          disabled ? "pointer-events-none opacity-60 grayscale-[30%]" : ""
        }`}
        aria-label={
          phase === "listening"
            ? "Остановить запись"
            : phase === "speaking"
              ? "Остановить воспроизведение"
              : "Начать запись"
        }
      >
        {/* Pulsing ring hint — visible only in idle */}
        {phase === "idle" && !disabled && (
          <div
            className="orb-ring-pulse absolute rounded-full"
            style={{
              width: "calc(clamp(120px, 35vw, 180px) + 24px)",
              height: "calc(clamp(120px, 35vw, 180px) + 24px)",
            }}
          />
        )}

        <div
          ref={ref}
          className={`flex items-center justify-center rounded-full transition-all duration-300 ${phaseClass} ${glowColor}`}
          style={{
            width: "clamp(120px, 35vw, 180px)",
            height: "clamp(120px, 35vw, 180px)",
            background:
              phase === "listening"
                ? "radial-gradient(circle at 35% 35%, hsl(0 60% 65%), hsl(0 50% 45%))"
                : "radial-gradient(circle at 35% 35%, hsl(195 60% 68%), hsl(195 55% 45%))",
            willChange: "transform, box-shadow",
          }}
        >
          {/* Inner highlight */}
          <div
            className="absolute rounded-full opacity-40"
            style={{
              width: "60%",
              height: "60%",
              top: "15%",
              left: "15%",
              background:
                "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.3), transparent 70%)",
            }}
          />

          {/* Icon */}
          {phase === "processing" ? (
            <Loader2 className="relative z-10 h-10 w-10 animate-spin text-white/90" />
          ) : phase === "listening" ? (
            <Square className="relative z-10 h-9 w-9 text-white/90" />
          ) : phase === "speaking" ? (
            <SkipForward className="relative z-10 h-10 w-10 text-white/90" />
          ) : (
            <Mic className="relative z-10 h-10 w-10 text-white/90" />
          )}
        </div>
      </button>
    );
  }
);
