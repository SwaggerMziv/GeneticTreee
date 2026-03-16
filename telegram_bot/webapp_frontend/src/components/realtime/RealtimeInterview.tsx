"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookPlus, Power, Send, Keyboard, X } from "lucide-react";
import { useRealtimeInterview } from "@/hooks/useRealtimeInterview";
import { useAudioReactive } from "@/hooks/useAudioReactive";
import {
  getInterviewHistory,
  confirmStory,
  createRelative,
  uploadStoryMedia,
} from "@/lib/api";
import { haptic, getTelegramWebApp } from "@/lib/telegram";
import type { DetectedRelative, PendingStory } from "@/lib/types";
import { AmbientBackground } from "@/components/voice/AmbientBackground";
import { AIOrb } from "@/components/voice/AIOrb";
import { StreamingSubtitles } from "./StreamingSubtitles";
import { StoryPreview } from "@/components/chat/StoryPreview";
import { RelativeDetected } from "@/components/chat/RelativeDetected";
import { InterviewOnboarding } from "@/components/chat/InterviewOnboarding";
import { Spinner } from "@/components/ui/Spinner";

export function RealtimeInterview() {
  const [detectedRelative, setDetectedRelative] = useState<DetectedRelative | null>(null);
  const [pendingStory, setPendingStory] = useState<PendingStory | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [relativeLoading, setRelativeLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textValue, setTextValue] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("webapp_onboardingDone_v1");
    }
    return false;
  });

  const orbRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    state,
    connect,
    disconnect,
    sendText,
    interrupt,
    micAnalyserRef,
    speakerAnalyserRef,
  } = useRealtimeInterview({
    onRelativeDetected: setDetectedRelative,
    onStoryPreview: setPendingStory,
  });

  // Set Telegram viewport stable height as CSS var
  useEffect(() => {
    const tg = getTelegramWebApp();
    if (tg) {
      document.documentElement.style.setProperty(
        "--tg-viewport-stable-height",
        `${tg.viewportStableHeight}px`
      );
    }
  }, []);

  // Load history on mount
  useEffect(() => {
    const load = async () => {
      try {
        const history = await getInterviewHistory();
        if (history.messages.length > 0) {
          setHasStarted(true);
        }
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setHistoryLoading(false);
      }
    };
    load();
  }, []);

  // Audio reactivity for orb
  const activeAnalyser =
    state.phase === "listening"
      ? micAnalyserRef.current
      : state.phase === "speaking"
        ? speakerAnalyserRef.current
        : null;

  useAudioReactive(orbRef, activeAnalyser, state.phase === "listening" || state.phase === "speaking");

  // Map realtime phase to AmbientBackground phase
  const ambientPhase =
    state.phase === "connecting" ? "processing" as const :
    state.phase === "listening" ? "listening" as const :
    state.phase === "speaking" ? "speaking" as const :
    "idle" as const;

  // ─── Handlers ───

  const handleOrbTap = useCallback(() => {
    if (state.phase === "idle" && !state.isConnected) {
      // First tap: connect
      setHasStarted(true);
      connect();
    } else if (state.phase === "speaking") {
      // Interrupt AI
      interrupt();
    }
    // In "listening" phase — VAD is automatic, no action needed
  }, [state.phase, state.isConnected, connect, interrupt]);

  const handleSendText = useCallback(() => {
    const text = textValue.trim();
    if (!text) return;
    sendText(text);
    setTextValue("");
    setShowTextInput(false);
    haptic("light");
  }, [textValue, sendText]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleEndInterview = useCallback(() => {
    disconnect();
    setHasStarted(false);
    setPhotos([]);
    haptic("medium");
  }, [disconnect]);

  // Confirm story via REST
  const handleConfirmStory = useCallback(
    async (action: "save" | "discard" | "continue") => {
      setConfirmLoading(true);
      try {
        const result = await confirmStory(action);
        if (result.success) {
          if (action === "save") {
            // Upload photos
            if (photos.length > 0 && result.story_key) {
              for (const photo of photos) {
                try {
                  await uploadStoryMedia(result.story_key, photo);
                } catch {
                  // Ignore individual failures
                }
              }
              setPhotos([]);
            }
            haptic("success");
          }
          setPendingStory(null);
        }
      } catch {
        haptic("error");
      } finally {
        setConfirmLoading(false);
      }
    },
    [photos]
  );

  // Create relative via REST
  const handleCreateRelative = useCallback(
    async (data: {
      first_name: string;
      last_name?: string;
      birth_year?: number;
      gender: string;
      relationship_type: string;
    }) => {
      setRelativeLoading(true);
      try {
        const result = await createRelative(data);
        if (result.success) {
          haptic("success");
        }
        setDetectedRelative(null);
      } catch {
        haptic("error");
      } finally {
        setRelativeLoading(false);
      }
    },
    []
  );

  const handleAddPhotos = useCallback(
    (files: FileList) => {
      const newPhotos = Array.from(files).slice(0, 5 - photos.length);
      setPhotos((prev) => [...prev, ...newPhotos]);
    },
    [photos.length]
  );

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ─── Render ───

  if (historyLoading) {
    return <Spinner className="mt-20" />;
  }

  if (showOnboarding) {
    return (
      <InterviewOnboarding onComplete={() => setShowOnboarding(false)} />
    );
  }

  const isProcessing = state.phase === "connecting";

  return (
    <>
      <div className="voice-immersive voice-mode-enter relative flex flex-col overflow-hidden safe-area-top safe-area-bottom">
        <AmbientBackground phase={ambientPhase} />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-3 py-2">
          {state.canCreateStory && state.isConnected && (
            <button
              onClick={() => {
                // Текстовая команда AI создать историю
                sendText("Создай историю из нашего разговора");
                haptic("light");
              }}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs text-white/70 backdrop-blur-sm transition-colors hover:bg-white/15 active:scale-95"
            >
              <BookPlus className="h-3.5 w-3.5" />
              Создать историю
            </button>
          )}
          <div /> {/* Spacer */}
        </div>

        {/* Center content area */}
        <div className="relative z-10 flex flex-1 flex-col items-center px-4 overflow-hidden">
          {/* Top zone: subtitles */}
          <div className="flex flex-1 flex-col items-center justify-end w-full min-h-0 overflow-hidden pb-3">
            {state.isConnected ? (
              <StreamingSubtitles
                userTranscript={state.userTranscript}
                aiTranscript={state.aiTranscript}
                phase={state.phase}
              />
            ) : state.error ? (
              <p className="px-4 text-center text-sm text-red-400/80">
                {state.error}
              </p>
            ) : (
              <div className="px-4 text-center">
                <p className="text-sm text-white/50">
                  {hasStarted
                    ? "Нажмите на сферу чтобы продолжить"
                    : "Нажмите на сферу, чтобы начать интервью"}
                </p>
              </div>
            )}
          </div>

          {/* Orb */}
          <div className="flex-shrink-0 py-2">
            <AIOrb
              ref={orbRef}
              phase={state.phase === "connecting" ? "connecting" : state.phase}
              disabled={isProcessing}
              onTap={handleOrbTap}
            />
          </div>

          {/* Bottom zone: phase label + text input toggle */}
          <div className="flex flex-shrink-0 flex-col items-center gap-2 pt-2 pb-1">
            <p className="text-xs text-white/40">
              {state.phase === "connecting"
                ? "Подключение..."
                : state.phase === "listening"
                  ? "Слушаю... (говорите свободно)"
                  : state.phase === "speaking"
                    ? "Интервьюер говорит... (нажмите чтобы прервать)"
                    : state.isConnected
                      ? "Ожидание..."
                      : hasStarted
                        ? "Нажмите на сферу"
                        : "Нажмите на сферу чтобы начать"}
            </p>
          </div>
        </div>

        {/* Text input bar (expandable from bottom) */}
        {showTextInput && state.isConnected && (
          <div className="relative z-10 flex items-center gap-2 border-t border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md">
            <input
              ref={inputRef}
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напишите ответ..."
              autoFocus
              className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
            />
            <button
              onClick={handleSendText}
              disabled={!textValue.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowTextInput(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/60"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Bottom toolbar */}
        <div className="relative z-10 flex items-center justify-between px-4 py-3">
          {state.isConnected && (
            <button
              onClick={() => {
                setShowTextInput((v) => !v);
                haptic("light");
              }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm backdrop-blur-sm transition-colors active:scale-95 ${
                showTextInput
                  ? "bg-primary/20 text-primary"
                  : "bg-white/10 text-white/60"
              }`}
            >
              <Keyboard className="h-4 w-4" />
              Текст
            </button>
          )}
          <div /> {/* Spacer */}
          <button
            onClick={handleEndInterview}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-sm text-white/60 backdrop-blur-sm transition-colors hover:bg-white/15 active:scale-95"
          >
            <Power className="h-4 w-4" />
            Выйти
          </button>
        </div>
      </div>

      {/* Detected relative overlay */}
      {detectedRelative && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/80 px-3 py-3 backdrop-blur-md">
          <RelativeDetected
            relative={detectedRelative}
            onCreateProfile={handleCreateRelative}
            onSkip={() => setDetectedRelative(null)}
            loading={relativeLoading}
          />
        </div>
      )}

      {/* Story preview modal */}
      {pendingStory && (
        <StoryPreview
          story={pendingStory}
          loading={confirmLoading}
          onSave={() => handleConfirmStory("save")}
          onDiscard={() => handleConfirmStory("discard")}
          onContinue={() => handleConfirmStory("continue")}
          photos={photos}
          onAddPhotos={handleAddPhotos}
          onRemovePhoto={handleRemovePhoto}
        />
      )}
    </>
  );
}
