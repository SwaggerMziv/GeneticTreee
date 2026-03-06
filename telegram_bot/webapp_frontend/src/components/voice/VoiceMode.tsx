"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, BookPlus, Mic2, Power } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useAudioReactive } from "@/hooks/useAudioReactive";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { transcribeVoice, synthesizeSpeech } from "@/lib/api";
import { useSSE } from "@/hooks/useSSE";
import { haptic, getTelegramWebApp } from "@/lib/telegram";
import type { SSEEvent, VoiceModeState } from "@/lib/types";
import { AmbientBackground } from "./AmbientBackground";
import { AIOrb } from "./AIOrb";
import { FlowingSubtitles } from "./FlowingSubtitles";

interface VoiceModeProps {
  onMessage: (userText: string, aiText: string) => void;
  onSSEEvent: (event: SSEEvent) => void;
  hasStarted: boolean;
  onStart: () => Promise<string>;
  isInterviewStreaming: boolean;
  photos: File[];
  onAddPhotos: (files: FileList) => void;
  onRemovePhoto: (index: number) => void;
  onEndInterview: () => void;
  canCreateStory: boolean;
  onCreateStory: () => void;
  onSwitchToText: () => void;
  lastAiMessage?: string;
  isCreatingStory?: boolean;
}

type Phase = VoiceModeState["phase"];

/** Таймер автоочистки субтитров (мс после окончания озвучки) */
const SUBTITLE_FADE_DELAY = 5000;

export function VoiceMode({
  onMessage,
  onSSEEvent,
  hasStarted,
  onStart,
  isInterviewStreaming,
  photos,
  onAddPhotos,
  onEndInterview,
  canCreateStory,
  onCreateStory,
  onSwitchToText,
  lastAiMessage,
  isCreatingStory,
}: VoiceModeProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [displayText, setDisplayText] = useState("");
  const [autoListenEnabled, setAutoListenEnabled] = useState(true);
  const [userTranscript, setUserTranscript] = useState("");
  const [isSubtitleRevealing, setIsSubtitleRevealing] = useState(false);
  const [msPerWord, setMsPerWord] = useState(150);

  const voiceRecorder = useVoiceRecorder();
  const audioPlayer = useAudioPlayer();
  const { stream, isStreaming } = useSSE();
  const speechRecognition = useSpeechRecognition("ru-RU");

  const autoListenRef = useRef(autoListenEnabled);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micAudioCtxRef = useRef<AudioContext | null>(null);
  const subtitleFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    autoListenRef.current = autoListenEnabled;
  }, [autoListenEnabled]);

  // Create mic analyser when recording starts
  useEffect(() => {
    const mediaStream = voiceRecorder.streamRef.current;
    if (phase === "listening" && mediaStream) {
      try {
        const ctx = new AudioContext();
        micAudioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;
        const source = ctx.createMediaStreamSource(mediaStream);
        source.connect(analyser);
        micAnalyserRef.current = analyser;
      } catch {
        // Ignore analyser creation errors
      }
    }

    return () => {
      if (phase !== "listening") {
        micAnalyserRef.current = null;
        if (micAudioCtxRef.current) {
          micAudioCtxRef.current.close().catch(() => {});
          micAudioCtxRef.current = null;
        }
      }
    };
  }, [phase, voiceRecorder.streamRef]);

  // Audio reactivity: feed --audio-level to orb
  const activeAnalyser =
    phase === "listening"
      ? micAnalyserRef.current
      : phase === "speaking"
        ? audioPlayer.analyserRef.current
        : null;

  useAudioReactive(
    orbRef,
    activeAnalyser,
    phase === "listening" || phase === "speaking"
  );

  /** Запустить таймер очистки субтитров */
  const scheduleSubtitleFade = useCallback(() => {
    if (subtitleFadeTimerRef.current) clearTimeout(subtitleFadeTimerRef.current);
    subtitleFadeTimerRef.current = setTimeout(() => {
      setDisplayText("");
      setUserTranscript("");
    }, SUBTITLE_FADE_DELAY);
  }, []);

  /** Отменить таймер очистки */
  const cancelSubtitleFade = useCallback(() => {
    if (subtitleFadeTimerRef.current) {
      clearTimeout(subtitleFadeTimerRef.current);
      subtitleFadeTimerRef.current = null;
    }
  }, []);

  // Cleanup timer + release microphone on unmount
  useEffect(() => {
    return () => {
      if (subtitleFadeTimerRef.current) clearTimeout(subtitleFadeTimerRef.current);
      voiceRecorder.releaseStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartListening = useCallback(async () => {
    cancelSubtitleFade();
    setUserTranscript("");
    setDisplayText("");
    setIsSubtitleRevealing(false);
    const ok = await voiceRecorder.startRecording();
    if (ok) {
      setPhase("listening");
      haptic("light");
      // Запускаем распознавание речи для live-субтитров
      if (speechRecognition.isAvailable) {
        speechRecognition.reset();
        speechRecognition.start();
      }
    }
  }, [voiceRecorder, cancelSubtitleFade, speechRecognition]);

  /** Озвучить текст AI и показать субтитры */
  const speakAndShowSubtitles = useCallback(async (text: string) => {
    try {
      setPhase("speaking");
      const audioData = await synthesizeSpeech(text);
      const { duration } = await audioPlayer.play(audioData);

      const wordCount = text.split(/\s+/).length;
      const calculatedMsPerWord = Math.max(
        60,
        Math.floor((duration * 1000) / Math.max(wordCount, 1))
      );
      setDisplayText(text);
      setMsPerWord(calculatedMsPerWord);
      setIsSubtitleRevealing(true);

      await waitForPlaybackEnd(audioPlayer);
      setIsSubtitleRevealing(false);
      return true;
    } catch {
      // TTS failed — show text statically
      setDisplayText(text);
      setIsSubtitleRevealing(false);
      setPhase("idle");
      return false;
    }
  }, [audioPlayer]);

  const handleStopListening = useCallback(async () => {
    // Останавливаем live-распознавание
    if (speechRecognition.isAvailable) {
      speechRecognition.stop();
    }

    // Clean up mic analyser
    micAnalyserRef.current = null;
    if (micAudioCtxRef.current) {
      micAudioCtxRef.current.close().catch(() => {});
      micAudioCtxRef.current = null;
    }

    const blob = await voiceRecorder.stopRecording();
    if (!blob) {
      setPhase("idle");
      return;
    }

    // Очищаем старый AI-текст чтобы показался индикатор "Думаю"
    setDisplayText("");
    setIsSubtitleRevealing(false);
    setPhase("processing");
    haptic("light");

    try {
      // 1. Transcribe via OpenAI Whisper API
      const result = await transcribeVoice(blob);
      if (!result.success || !result.text) {
        setDisplayText("Не удалось распознать речь. Попробуйте ещё раз.");
        setPhase("idle");
        scheduleSubtitleFade();
        return;
      }

      const userText = result.text;
      setUserTranscript(userText);

      // 2. Send to AI via SSE
      let aiResponse = "";
      await stream("/interview/message", { text: userText }, (event: SSEEvent) => {
        onSSEEvent(event);
        if (event.type === "question") {
          aiResponse = event.content || "";
        }
      });

      if (!aiResponse) {
        setPhase("idle");
        return;
      }

      onMessage(userText, aiResponse);

      // 3. TTS — озвучка + синхронизированные субтитры
      const ttsOk = await speakAndShowSubtitles(aiResponse);

      if (!ttsOk) {
        await new Promise((r) => setTimeout(r, 4000));
      }

      // Таймер очистки субтитров через 5 сек
      scheduleSubtitleFade();

      // 4. Auto-listen
      if (autoListenRef.current) {
        cancelSubtitleFade();
        setUserTranscript("");
        const ok = await voiceRecorder.startRecording();
        if (ok) {
          setPhase("listening");
          haptic("light");
          if (speechRecognition.isAvailable) {
            speechRecognition.reset();
            speechRecognition.start();
          }
          return;
        }
      }
      setPhase("idle");
    } catch {
      setDisplayText("Произошла ошибка. Попробуйте ещё раз.");
      setPhase("idle");
      scheduleSubtitleFade();
    }
  }, [voiceRecorder, stream, onSSEEvent, onMessage, speakAndShowSubtitles, scheduleSubtitleFade, cancelSubtitleFade, speechRecognition]);

  const handleOrbTap = useCallback(async () => {
    if (phase === "listening") {
      handleStopListening();
    } else if (phase === "speaking") {
      audioPlayer.stop();
      setIsSubtitleRevealing(false);
      setPhase("idle");
      scheduleSubtitleFade();
    } else if (phase === "idle") {
      cancelSubtitleFade();

      if (!hasStarted) {
        // Первый тап: запускаем интервью, озвучиваем вопрос, потом слушаем
        setPhase("processing");
        const firstQuestion = await onStart();

        if (firstQuestion) {
          await speakAndShowSubtitles(firstQuestion);
          scheduleSubtitleFade();

          // Auto-listen после первого вопроса
          if (autoListenRef.current) {
            cancelSubtitleFade();
            setUserTranscript("");
            const ok = await voiceRecorder.startRecording();
            if (ok) {
              setPhase("listening");
              haptic("light");
              if (speechRecognition.isAvailable) {
                speechRecognition.reset();
                speechRecognition.start();
              }
              return;
            }
          }
          setPhase("idle");
        } else {
          setPhase("idle");
        }
        return;
      }

      handleStartListening();
    }
  }, [phase, hasStarted, onStart, handleStartListening, handleStopListening, audioPlayer, scheduleSubtitleFade, cancelSubtitleFade, speakAndShowSubtitles, voiceRecorder, speechRecognition]);

  const isProcessing = phase === "processing" || isStreaming || isInterviewStreaming;

  return (
    <div className="voice-immersive voice-mode-enter relative flex flex-col overflow-hidden safe-area-top safe-area-bottom">
      <AmbientBackground phase={phase} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-3 py-2">
        <button
          onClick={onSwitchToText}
          className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs text-white/70 backdrop-blur-sm transition-colors hover:bg-white/15 active:scale-95"
        >
          <Mic2 className="h-3.5 w-3.5" />
          Текст
        </button>

        {canCreateStory && !isStreaming && (
          <button
            onClick={onCreateStory}
            disabled={isCreatingStory}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs text-white/70 backdrop-blur-sm transition-colors hover:bg-white/15 active:scale-95 disabled:opacity-50"
          >
            <BookPlus className="h-3.5 w-3.5" />
            {isCreatingStory ? "Создаю..." : "Создать историю"}
          </button>
        )}
      </div>

      {/* Center content area */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3 px-4">
        {/* AI subtitles / processing indicator / placeholder */}
        {phase === "listening" ? (
          /* Live-транскрипт во время записи */
          <LiveTranscript
            text={speechRecognition.transcript}
            duration={voiceRecorder.duration}
          />
        ) : isProcessing && !displayText ? (
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50" style={{ animationDelay: "300ms" }} />
            </div>
            <p className="text-sm font-medium text-white/70">
              Интервьюер думает...
            </p>
            <p className="text-xs text-white/40">
              Подождите, идёт обработка
            </p>
          </div>
        ) : displayText ? (
          <FlowingSubtitles
            text={displayText}
            isRevealing={isSubtitleRevealing}
            msPerWord={msPerWord}
          />
        ) : (
          <div className="px-4 text-center">
            <p className="text-sm text-white/50">
              {hasStarted
                ? "Нажмите на сферу и расскажите"
                : "Нажмите на сферу, чтобы начать"}
            </p>
          </div>
        )}

        {/* AI Orb */}
        <AIOrb
          ref={orbRef}
          phase={phase}
          disabled={isProcessing}
          onTap={handleOrbTap}
        />

        {/* User transcript after Whisper recognition — compact */}
        {userTranscript && phase !== "listening" && (
          <UserTranscript text={userTranscript} />
        )}

        {/* Phase label */}
        <p className="text-xs text-white/40">
          {phase === "listening"
            ? `Нажмите ■ когда закончите (${voiceRecorder.duration}с)`
            : isProcessing
              ? ""
              : phase === "speaking"
                ? "Нажмите ▶▶ чтобы пропустить"
                : hasStarted && displayText
                  ? "Нажмите 🎤 и ответьте"
                  : hasStarted
                    ? "Нажмите 🎤 чтобы ответить"
                    : "Нажмите 🎤 чтобы начать интервью"}
        </p>
      </div>

      {/* Bottom toolbar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                onAddPhotos(e.target.files);
                e.target.value = "";
              }
            }}
          />
          <button
            onClick={() => {
              haptic("light");
              photoInputRef.current?.click();
            }}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-sm text-white/60 backdrop-blur-sm transition-colors hover:bg-white/15 active:scale-95"
          >
            <Camera className="h-4 w-4" />
            {photos.length > 0 ? `Фото (${photos.length})` : "Фото"}
          </button>
        </div>

        <button
          onClick={() => setAutoListenEnabled((v) => !v)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs backdrop-blur-sm transition-colors active:scale-95 ${
            autoListenEnabled
              ? "bg-primary/20 text-primary"
              : "bg-white/10 text-white/40"
          }`}
        >
          <div
            className={`h-2 w-2 rounded-full transition-colors ${
              autoListenEnabled ? "bg-primary" : "bg-white/30"
            }`}
          />
          Авто
        </button>

        <button
          onClick={onEndInterview}
          className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-sm text-white/60 backdrop-blur-sm transition-colors hover:bg-white/15 active:scale-95"
        >
          <Power className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </div>
  );
}

/** Live-субтитры речи пользователя (показывает последние 1-2 предложения) */
function LiveTranscript({ text, duration }: { text: string; duration: number }) {
  const [expanded, setExpanded] = useState(false);

  if (!text) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 text-center">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-400/70" />
        </div>
        <p className="text-sm text-white/60">
          Говорите... ({duration}с)
        </p>
      </div>
    );
  }

  // Показываем последние 2 предложения
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const lastSentences = sentences.slice(-2).join(" ");
  const hasMore = sentences.length > 2;
  const displayedText = expanded ? text : lastSentences;

  return (
    <div className="w-full max-w-[85%] px-2">
      <div
        onClick={hasMore ? () => setExpanded((v) => !v) : undefined}
        className={`animate-subtitle-in mx-auto rounded-2xl bg-white/10 px-4 py-2.5 text-center text-sm text-white/80 backdrop-blur-sm ${
          hasMore ? "cursor-pointer" : ""
        } ${expanded ? "max-h-[25vh] overflow-y-auto" : ""}`}
      >
        <div className="mb-1 flex items-center justify-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
          <span className="text-[10px] uppercase tracking-wider text-white/40">
            запись ({duration}с)
          </span>
        </div>
        {displayedText}
        {hasMore && !expanded && (
          <span className="ml-1 text-white/40">...</span>
        )}
      </div>
    </div>
  );
}

/** Компактный сворачиваемый блок с текстом пользователя */
function UserTranscript({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const words = text.split(/\s+/);
  const isLong = words.length > 20;
  const preview = isLong && !expanded ? words.slice(0, 20).join(" ") + "..." : text;

  return (
    <div className="animate-subtitle-in w-full max-w-[85%] px-2">
      <div
        onClick={isLong ? () => setExpanded((v) => !v) : undefined}
        className={`ml-auto max-w-full rounded-2xl rounded-br-sm bg-white/15 px-3 py-2 text-sm text-white/70 backdrop-blur-sm ${
          isLong ? "cursor-pointer" : ""
        } ${expanded ? "max-h-[25vh] overflow-y-auto" : ""}`}
      >
        {preview}
      </div>
    </div>
  );
}

function waitForPlaybackEnd(player: { isPlaying: boolean }): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (!player.isPlaying) {
        resolve();
      } else {
        setTimeout(check, 200);
      }
    };
    setTimeout(check, 300);
  });
}
