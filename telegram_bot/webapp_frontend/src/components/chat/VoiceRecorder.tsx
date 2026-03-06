"use client";

import { Mic, Square, X } from "lucide-react";
import { haptic } from "@/lib/telegram";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceRecorder({
  isRecording,
  duration,
  onStart,
  onStop,
  onCancel,
  disabled,
}: {
  isRecording: boolean;
  duration: number;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  disabled?: boolean;
}) {
  if (isRecording) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            haptic("light");
            onCancel();
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 text-sm text-destructive">
          <span className="animate-pulse-record h-2.5 w-2.5 rounded-full bg-destructive" />
          <span className="font-mono">{formatDuration(duration)}</span>
        </div>
        <button
          onClick={() => {
            haptic("medium");
            onStop();
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
        >
          <Square className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        haptic("light");
        onStart();
      }}
      disabled={disabled}
      className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary disabled:opacity-50"
    >
      <Mic className="h-5 w-5" />
    </button>
  );
}
