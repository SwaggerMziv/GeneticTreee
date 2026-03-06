"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FlowingSubtitlesProps {
  text: string;
  isRevealing: boolean;
  msPerWord: number;
  className?: string;
}

/** Количество слов в свёрнутом виде */
const COLLAPSED_WORDS = 25;

/**
 * Сворачиваемые субтитры с word-by-word анимацией.
 *
 * - Во время TTS (isRevealing) — слова появляются по одному, блок раскрыт
 * - После окончания TTS — автоматически сворачивается до COLLAPSED_WORDS слов
 * - Тап по тексту — развернуть/свернуть
 */
export function FlowingSubtitles({
  text,
  isRevealing,
  msPerWord,
  className = "",
}: FlowingSubtitlesProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevTextRef = useRef(text);
  const words = text ? text.split(/\s+/) : [];
  const isLong = words.length > COLLAPSED_WORDS;

  // При смене текста — сброс
  useEffect(() => {
    if (text !== prevTextRef.current) {
      prevTextRef.current = text;
      setRevealedCount(isRevealing ? 0 : words.length);
      setExpanded(false);
    }
  }, [text, isRevealing, words.length]);

  // Автосворачивание после окончания озвучки
  useEffect(() => {
    if (!isRevealing && isLong) {
      setExpanded(false);
    }
  }, [isRevealing, isLong]);

  // Word reveal timer
  useEffect(() => {
    if (!isRevealing || words.length === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (!isRevealing && words.length > 0) {
        setRevealedCount(words.length);
      }
      return;
    }

    setRevealedCount(0);
    let count = 0;
    const interval = Math.max(msPerWord, 60);

    timerRef.current = setInterval(() => {
      count++;
      setRevealedCount(count);
      if (count >= words.length) {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRevealing, text, msPerWord, words.length]);

  // Auto-scroll
  useEffect(() => {
    if (containerRef.current && (isRevealing || expanded)) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [revealedCount, expanded, isRevealing]);

  const toggleExpand = useCallback(() => {
    setExpanded((v) => !v);
  }, []);

  if (!text) return null;

  // Во время reveal — показываем все слова (анимированно), раскрытый вид
  if (isRevealing) {
    return (
      <div
        ref={containerRef}
        className={`max-h-[30vh] overflow-y-auto px-4 text-center ${className}`}
      >
        <p className="text-[15px] leading-relaxed text-white/90">
          {words.map((word, i) => (
            <span
              key={i}
              className={i < revealedCount ? "word-revealed" : "word-reveal"}
              style={
                i >= revealedCount
                  ? { animationDelay: `${(i - revealedCount) * Math.max(msPerWord, 60)}ms` }
                  : undefined
              }
            >
              {word}{" "}
            </span>
          ))}
        </p>
      </div>
    );
  }

  // Статический режим — сворачиваемый
  const showWords = expanded || !isLong ? words : words.slice(0, COLLAPSED_WORDS);

  return (
    <div className={`w-full px-4 ${className}`}>
      <div
        ref={containerRef}
        onClick={isLong ? toggleExpand : undefined}
        className={`relative overflow-hidden text-center transition-all duration-300 ${
          isLong ? "cursor-pointer" : ""
        } ${expanded ? "max-h-[35vh] overflow-y-auto" : "max-h-[4.5rem]"}`}
      >
        <p className="text-[15px] leading-relaxed text-white/90">
          {showWords.join(" ")}
          {!expanded && isLong && "..."}
        </p>

        {/* Градиент-затемнение внизу в свёрнутом виде */}
        {!expanded && isLong && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/60 to-transparent" />
        )}
      </div>

      {/* Кнопка развернуть/свернуть */}
      {isLong && (
        <button
          onClick={toggleExpand}
          className="mx-auto mt-1 flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] text-white/40 transition-colors hover:text-white/60"
        >
          {expanded ? (
            <>Свернуть <ChevronUp className="h-3 w-3" /></>
          ) : (
            <>Читать полностью <ChevronDown className="h-3 w-3" /></>
          )}
        </button>
      )}
    </div>
  );
}
