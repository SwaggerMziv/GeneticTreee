"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Голосовой рекордер с персистентным MediaStream.
 * Stream запрашивается один раз и переиспользуется между записями,
 * чтобы не запрашивать разрешение на микрофон каждый раз.
 */
export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /** Получить или переиспользовать MediaStream */
  const acquireStream = useCallback(async (): Promise<MediaStream> => {
    // Проверяем что существующий stream жив (все треки active)
    const existing = streamRef.current;
    if (existing && existing.getAudioTracks().every((t) => t.readyState === "live")) {
      return existing;
    }
    // Запрашиваем новый stream
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    return stream;
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await acquireStream();

      // Prefer webm/opus, fallback to whatever browser supports
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      return true;
    } catch {
      return false;
    }
  }, [acquireStream]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        // НЕ останавливаем треки — stream переиспользуется
        setIsRecording(false);
        setDuration(0);
        resolve(blob);
      };

      recorder.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // НЕ останавливаем треки
    setIsRecording(false);
    setDuration(0);
    chunksRef.current = [];
  }, []);

  /** Полностью освободить микрофон (вызывать при unmount) */
  const releaseStream = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setDuration(0);
    chunksRef.current = [];
  }, []);

  return {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
    releaseStream,
    streamRef,
  };
}
