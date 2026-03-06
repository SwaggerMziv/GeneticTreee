"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, BookPlus, Mic, MessageSquareText } from "lucide-react";
import { useSSE } from "@/hooks/useSSE";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import {
  getInterviewHistory,
  confirmStory,
  createRelative,
  transcribeVoice,
  uploadStoryMedia,
} from "@/lib/api";
import { haptic } from "@/lib/telegram";
import type {
  ChatMessage,
  SSEEvent,
  DetectedRelative,
  PendingStory,
  InterviewMode,
} from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { VoiceRecorder } from "./VoiceRecorder";
import { PhotoUploader } from "./PhotoUploader";
import { StoryPreview } from "./StoryPreview";
import { RelativeDetected } from "./RelativeDetected";
import { InterviewOnboarding } from "./InterviewOnboarding";
import { VoiceMode } from "@/components/voice/VoiceMode";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

const MAX_PHOTOS = 5;

export function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [canCreateStory, setCanCreateStory] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [detectedRelative, setDetectedRelative] =
    useState<DetectedRelative | null>(null);
  const [pendingStory, setPendingStory] = useState<PendingStory | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [relativeLoading, setRelativeLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("webapp_onboardingDone_v1");
    }
    return false;
  });
  const [mode, setMode] = useState<InterviewMode | null>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("webapp_interviewMode");
      if (saved === "voice" || saved === "text") return saved;
    }
    return null;
  });

  const { stream, isStreaming } = useSSE();
  const voiceRecorder = useVoiceRecorder();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, statusText, detectedRelative, scrollToBottom]);

  // Load interview history on mount
  useEffect(() => {
    const load = async () => {
      try {
        const history = await getInterviewHistory();
        if (history.messages.length > 0) {
          setMessages(history.messages);
          setQuestionCount(history.question_count);
          setCanCreateStory(history.can_create_story);
          setHasStarted(true);
        }
      } catch (error) {
        console.error("Failed to load history:", error);
      } finally {
        setHistoryLoading(false);
      }
    };
    load();
  }, []);

  // Handle SSE events
  const handleSSEEvent = useCallback((event: SSEEvent) => {
    switch (event.type) {
      case "status":
        setStatusText(event.content || null);
        break;
      case "question":
        setStatusText(null);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: event.content || "" },
        ]);
        setQuestionCount(event.question_count || 0);
        setCanCreateStory(event.can_create_story || false);
        haptic("light");
        break;
      case "relative_detected":
        setDetectedRelative({
          name: event.name || "",
          probable_role: event.probable_role || "other",
          context: event.context || "",
        });
        haptic("medium");
        break;
      case "story_preview":
        setStatusText(null);
        setPendingStory({
          title: event.title || "",
          text: event.text || "",
        });
        haptic("success");
        break;
      case "insufficient_data":
        setStatusText(null);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Недостаточно данных для истории: ${event.content}\n\nПродолжите рассказывать — добавьте конкретные имена, даты и события.`,
          },
        ]);
        haptic("warning");
        break;
      case "error":
        setStatusText(null);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ ${event.content}` },
        ]);
        haptic("error");
        break;
      case "done":
        setStatusText(null);
        break;
    }
  }, []);

  // SSE event handler for voice mode (doesn't add messages — VoiceMode does that)
  const handleVoiceSSEEvent = useCallback((event: SSEEvent) => {
    switch (event.type) {
      case "status":
        setStatusText(event.content || null);
        break;
      case "question":
        setStatusText(null);
        setQuestionCount(event.question_count || 0);
        setCanCreateStory(event.can_create_story || false);
        break;
      case "relative_detected":
        setDetectedRelative({
          name: event.name || "",
          probable_role: event.probable_role || "other",
          context: event.context || "",
        });
        haptic("medium");
        break;
      case "story_preview":
        setStatusText(null);
        setPendingStory({
          title: event.title || "",
          text: event.text || "",
        });
        haptic("success");
        break;
      case "done":
        setStatusText(null);
        break;
    }
  }, []);

  // Start interview — returns first question text for voice mode TTS
  const handleStart = useCallback(async (): Promise<string> => {
    setHasStarted(true);
    let firstQuestion = "";
    await stream("/interview/start", undefined, (event) => {
      handleSSEEvent(event);
      if (event.type === "question") {
        firstQuestion = event.content || "";
      }
    });
    return firstQuestion;
  }, [stream, handleSSEEvent]);

  // Send message
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    setInputText("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    haptic("light");

    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    await stream("/interview/message", { text }, handleSSEEvent);
  }, [inputText, isStreaming, stream, handleSSEEvent]);

  // Voice recording
  const handleVoiceStart = useCallback(async () => {
    const ok = await voiceRecorder.startRecording();
    if (!ok) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Не удалось получить доступ к микрофону",
        },
      ]);
    }
  }, [voiceRecorder]);

  const handleVoiceStop = useCallback(async () => {
    const blob = await voiceRecorder.stopRecording();
    if (!blob) return;

    setTranscribing(true);
    try {
      const result = await transcribeVoice(blob);
      if (result.success && result.text) {
        setInputText(result.text);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "⚠️ Не удалось распознать речь. Попробуйте ещё раз или введите текст.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Ошибка распознавания голоса" },
      ]);
    } finally {
      setTranscribing(false);
    }
  }, [voiceRecorder]);

  // Create story (с защитой от повторных нажатий)
  const handleCreateStory = useCallback(async () => {
    if (isCreatingStory) return;
    setIsCreatingStory(true);
    try {
      await stream("/interview/create-story", undefined, handleSSEEvent);
    } finally {
      setIsCreatingStory(false);
    }
  }, [stream, handleSSEEvent, isCreatingStory]);

  // Mode switching with persistence
  const handleSetMode = useCallback((newMode: InterviewMode | null) => {
    setMode(newMode);
    if (newMode) {
      sessionStorage.setItem("webapp_interviewMode", newMode);
    } else {
      sessionStorage.removeItem("webapp_interviewMode");
    }
  }, []);

  // Confirm story
  const handleConfirmStory = useCallback(
    async (action: "save" | "discard" | "continue") => {
      setConfirmLoading(true);
      try {
        const result = await confirmStory(action);
        if (result.success) {
          if (action === "save") {
            // Upload photos if any
            if (photos.length > 0 && result.story_key) {
              for (const photo of photos) {
                try {
                  await uploadStoryMedia(result.story_key, photo);
                } catch {
                  // Ignore individual upload failures
                }
              }
              setPhotos([]);
            }
            setMessages([]);
            setQuestionCount(0);
            setCanCreateStory(false);
            setHasStarted(false);
            handleSetMode(null);
            haptic("success");
          }
          setPendingStory(null);
          if (action !== "save") {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: result.message },
            ]);
          }
        }
      } catch {
        haptic("error");
      } finally {
        setConfirmLoading(false);
      }
    },
    [photos, handleSetMode]
  );

  // Create relative
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
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `✓ ${result.message}` },
          ]);
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

  // VoiceMode message callback
  const handleVoiceMessage = useCallback((userText: string, aiText: string) => {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userText },
      { role: "assistant", content: aiText },
    ]);
  }, []);

  // End interview — reset and go to mode selection
  const handleEndInterview = useCallback(() => {
    setMessages([]);
    setQuestionCount(0);
    setCanCreateStory(false);
    setHasStarted(false);
    handleSetMode(null);
    setPhotos([]);
    haptic("medium");
  }, [handleSetMode]);

  // Photo handlers
  const handleAddPhotos = useCallback(
    (files: FileList) => {
      const newPhotos = Array.from(files).slice(
        0,
        MAX_PHOTOS - photos.length
      );
      setPhotos((prev) => [...prev, ...newPhotos]);
    },
    [photos.length]
  );

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Textarea auto-resize
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (historyLoading) {
    return <Spinner className="mt-20" />;
  }

  // Онбординг для новых пользователей
  if (showOnboarding) {
    return (
      <InterviewOnboarding
        onComplete={() => setShowOnboarding(false)}
      />
    );
  }

  // Welcome screen — choose mode
  if (!mode) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="text-5xl">🌳</div>
        <h2 className="font-heading text-lg font-semibold">
          Семейное интервью
        </h2>
        <p className="text-sm text-muted-foreground">
          Расскажите свои семейные истории — ИИ задаст вопросы и создаст
          красивый текст для вашего архива.
        </p>

        <div className="flex w-full max-w-xs flex-col gap-3">
          <Button
            onClick={() => handleSetMode("voice")}
            size="lg"
            className="w-full gap-2"
          >
            <Mic className="h-5 w-5" />
            Голосовое интервью
          </Button>
          <Button
            onClick={() => {
              handleSetMode("text");
              if (!hasStarted) handleStart();
            }}
            variant="secondary"
            size="lg"
            className="w-full gap-2"
          >
            <MessageSquareText className="h-5 w-5" />
            Текстовое интервью
          </Button>
        </div>

        {hasStarted && (
          <p className="text-xs text-muted-foreground">
            У вас есть незаконченное интервью — выберите режим чтобы продолжить
          </p>
        )}
      </div>
    );
  }

  // Последнее AI-сообщение для voice mode
  const lastAiMessage = messages.filter(m => m.role === "assistant").at(-1)?.content || "";

  // Voice mode — fully immersive
  if (mode === "voice") {
    return (
      <>
        <VoiceMode
          onMessage={handleVoiceMessage}
          onSSEEvent={handleVoiceSSEEvent}
          hasStarted={hasStarted}
          onStart={handleStart}
          isInterviewStreaming={isStreaming}
          photos={photos}
          onAddPhotos={handleAddPhotos}
          onRemovePhoto={handleRemovePhoto}
          onEndInterview={handleEndInterview}
          canCreateStory={canCreateStory}
          onCreateStory={handleCreateStory}
          onSwitchToText={() => handleSetMode("text")}
          lastAiMessage={lastAiMessage}
          isCreatingStory={isCreatingStory}
        />

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

  // Text mode
  return (
    <div className="flex h-full flex-col">
      {/* Header with mode switch — floating pill */}
      {!voiceRecorder.isRecording && (
        <div className="flex items-center justify-end border-b border-border px-3 py-1.5">
          <button
            onClick={() => handleSetMode("voice")}
            className="flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary shadow-sm backdrop-blur-sm transition-all hover:bg-primary/15 active:scale-95"
            style={{ minHeight: "44px" }}
          >
            <Mic className="h-4 w-4" />
            Голос
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="chat-scroll flex-1 overflow-y-auto px-3 py-3"
      >
        <div className="flex flex-col gap-2.5">
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {(isStreaming || transcribing) && (
            <TypingIndicator
              text={transcribing ? "Распознаю голос..." : statusText || undefined}
            />
          )}

          {detectedRelative && (
            <RelativeDetected
              relative={detectedRelative}
              onCreateProfile={handleCreateRelative}
              onSkip={() => setDetectedRelative(null)}
              loading={relativeLoading}
            />
          )}
        </div>
      </div>

      {/* Create story button */}
      {canCreateStory && !isStreaming && (
        <div className="flex justify-center border-t border-border px-3 py-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCreateStory}
            loading={isCreatingStory}
            disabled={isCreatingStory}
          >
            <BookPlus className="h-4 w-4" />
            {isCreatingStory ? "Создаю историю..." : `Создать историю (${questionCount} вопросов)`}
          </Button>
        </div>
      )}

      {/* Photos preview */}
      {photos.length > 0 && (
        <div className="border-t border-border px-3 py-2">
          <PhotoUploader
            photos={photos}
            onAdd={handleAddPhotos}
            onRemove={handleRemovePhoto}
            disabled={isStreaming}
          />
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-1.5 border-t border-border bg-card p-2">
        <PhotoUploader
          photos={[]}
          onAdd={handleAddPhotos}
          onRemove={handleRemovePhoto}
          disabled={isStreaming || voiceRecorder.isRecording}
        />

        {voiceRecorder.isRecording ? (
          <div className="flex flex-1 items-center justify-center">
            <VoiceRecorder
              isRecording={true}
              duration={voiceRecorder.duration}
              onStart={handleVoiceStart}
              onStop={handleVoiceStop}
              onCancel={voiceRecorder.cancelRecording}
            />
          </div>
        ) : (
          <>
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Напишите ответ..."
              rows={1}
              disabled={isStreaming || transcribing}
              className="max-h-[120px] min-h-[40px] flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />

            {inputText.trim() ? (
              <button
                onClick={handleSend}
                disabled={isStreaming}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            ) : (
              <VoiceRecorder
                isRecording={false}
                duration={0}
                onStart={handleVoiceStart}
                onStop={handleVoiceStop}
                onCancel={voiceRecorder.cancelRecording}
                disabled={isStreaming || transcribing}
              />
            )}
          </>
        )}
      </div>

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
    </div>
  );
}
