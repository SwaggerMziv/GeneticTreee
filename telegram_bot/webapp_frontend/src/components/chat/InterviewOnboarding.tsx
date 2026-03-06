"use client";

import { useCallback, useState } from "react";
import { TreePine, Mic, MessageCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { haptic } from "@/lib/telegram";

const STORAGE_KEY = "webapp_onboardingDone_v1";

interface InterviewOnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: TreePine,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-500/10",
    title: "Семейный архив",
    text: "Расскажите ваши истории — ИИ-интервьюер задаст вопросы и сохранит воспоминания для всей семьи.",
  },
  {
    icon: MessageCircle,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    title: "Как это работает",
    steps: [
      "ИИ задаёт вопрос о вашей семье",
      "Вы отвечаете голосом или текстом",
      "Из ваших ответов создаётся история",
    ],
  },
  {
    icon: Mic,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
    title: "Разрешите микрофон",
    text: "Для голосового интервью нужен доступ к микрофону. Вы также можете общаться текстом.",
    isMicSlide: true,
  },
] as const;

export function InterviewOnboarding({ onComplete }: InterviewOnboardingProps) {
  const [step, setStep] = useState(0);
  const [micRequesting, setMicRequesting] = useState(false);

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1");
    onComplete();
  }, [onComplete]);

  const handleNext = useCallback(() => {
    haptic("light");
    if (step < slides.length - 1) {
      setStep((s) => s + 1);
    } else {
      finish();
    }
  }, [step, finish]);

  const handleRequestMic = useCallback(async () => {
    setMicRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Сразу останавливаем — нужно только разрешение
      stream.getTracks().forEach((t) => t.stop());
      haptic("success");
    } catch {
      // Пользователь отклонил — ничего страшного
    } finally {
      setMicRequesting(false);
      finish();
    }
  }, [finish]);

  const slide = slides[step];
  const Icon = slide.icon;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6 text-center">
      {/* Icon */}
      <div className={`flex h-20 w-20 items-center justify-center rounded-full ${slide.iconBg}`}>
        <Icon className={`h-10 w-10 ${slide.iconColor}`} />
      </div>

      {/* Title */}
      <h2 className="font-heading text-xl font-semibold">{slide.title}</h2>

      {/* Content */}
      {"text" in slide && slide.text && (
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          {slide.text}
        </p>
      )}

      {"steps" in slide && slide.steps && (
        <div className="flex flex-col gap-3 text-left">
          {slide.steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </div>
              <p className="text-sm text-muted-foreground">{s}</p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
        {"isMicSlide" in slide && slide.isMicSlide ? (
          <>
            <Button
              onClick={handleRequestMic}
              size="lg"
              loading={micRequesting}
              className="w-full gap-2"
            >
              <Mic className="h-5 w-5" />
              Разрешить микрофон
            </Button>
            <button
              onClick={finish}
              className="text-sm text-muted-foreground underline-offset-2 hover:underline"
            >
              Пропустить
            </button>
          </>
        ) : (
          <Button
            onClick={handleNext}
            size="lg"
            className="w-full gap-2"
          >
            Далее
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Dots indicator */}
      <div className="flex gap-2">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === step
                ? "w-6 bg-primary"
                : i < step
                  ? "w-1.5 bg-primary/40"
                  : "w-1.5 bg-muted-foreground/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
