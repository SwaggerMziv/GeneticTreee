"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getToken, getApiBaseUrl } from "@/lib/api";
import { haptic } from "@/lib/telegram";
import type {
  RealtimeState,
  WSIncomingMessage,
  DetectedRelative,
  PendingStory,
} from "@/lib/types";

const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 3;

interface UseRealtimeInterviewOptions {
  onRelativeDetected?: (relative: DetectedRelative) => void;
  onStoryPreview?: (story: PendingStory) => void;
  onQuestionCount?: (count: number, canCreateStory: boolean) => void;
}

export function useRealtimeInterview(options: UseRealtimeInterviewOptions = {}) {
  const [state, setState] = useState<RealtimeState>({
    phase: "idle",
    isConnected: false,
    userTranscript: "",
    aiTranscript: "",
    questionCount: 0,
    canCreateStory: false,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isCleaningUpRef = useRef(false);

  // Audio playback state
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);

  // Mic analyser for orb visualization
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micAudioCtxRef = useRef<AudioContext | null>(null);

  // Refs for options callbacks (to avoid stale closures)
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // ─── Audio Capture ───

  const startMicCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      // Try AudioWorklet first, fallback to ScriptProcessor
      const nativeSampleRate = AudioContext
        ? new AudioContext().sampleRate
        : 48000;

      let ctx: AudioContext;
      try {
        ctx = new AudioContext({ sampleRate: 24000 });
      } catch {
        // iOS fallback — may not support arbitrary sample rates
        ctx = new AudioContext();
      }
      audioContextRef.current = ctx;

      // Create mic analyser for orb visualization
      const micAnalyser = ctx.createAnalyser();
      micAnalyser.fftSize = 128;
      micAnalyser.smoothingTimeConstant = 0.8;
      micAnalyserRef.current = micAnalyser;
      micAudioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(micAnalyser);

      try {
        // AudioWorklet path
        await ctx.audioWorklet.addModule("/worklets/pcm-processor.js");
        const worklet = new AudioWorkletNode(ctx, "pcm-processor", {
          processorOptions: { sampleRate: ctx.sampleRate },
        });

        worklet.port.onmessage = (e: MessageEvent) => {
          const { pcm16 } = e.data;
          if (pcm16 && wsRef.current?.readyState === WebSocket.OPEN) {
            // ArrayBuffer → base64
            const bytes = new Uint8Array(pcm16);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            const b64 = btoa(binary);
            wsRef.current.send(JSON.stringify({ type: "audio", data: b64 }));
          }
        };

        source.connect(worklet);
        worklet.connect(ctx.destination); // Required for processing
        workletNodeRef.current = worklet;
      } catch {
        // Fallback: ScriptProcessorNode
        const bufferSize = 4096;
        const scriptNode = ctx.createScriptProcessor(bufferSize, 1, 1);

        let pcmBuffer = new Float32Array(0);
        const CHUNK_SIZE = 4800; // 200ms at 24kHz

        scriptNode.onaudioprocess = (e: AudioProcessingEvent) => {
          const input = e.inputBuffer.getChannelData(0);

          // Simple resampling if needed
          let samples: Float32Array;
          if (Math.abs(ctx.sampleRate - 24000) < 100) {
            samples = input;
          } else {
            const ratio = ctx.sampleRate / 24000;
            const outputLen = Math.round(input.length / ratio);
            samples = new Float32Array(outputLen);
            for (let i = 0; i < outputLen; i++) {
              const srcIdx = i * ratio;
              const floor = Math.floor(srcIdx);
              const ceil = Math.min(floor + 1, input.length - 1);
              const frac = srcIdx - floor;
              samples[i] = input[floor] * (1 - frac) + input[ceil] * frac;
            }
          }

          // Accumulate
          const newBuf = new Float32Array(pcmBuffer.length + samples.length);
          newBuf.set(pcmBuffer);
          newBuf.set(samples, pcmBuffer.length);
          pcmBuffer = newBuf;

          while (pcmBuffer.length >= CHUNK_SIZE) {
            const chunk = pcmBuffer.slice(0, CHUNK_SIZE);
            pcmBuffer = pcmBuffer.slice(CHUNK_SIZE);

            // Float32 → Int16
            const pcm16 = new Int16Array(chunk.length);
            for (let i = 0; i < chunk.length; i++) {
              const s = Math.max(-1, Math.min(1, chunk[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }

            if (wsRef.current?.readyState === WebSocket.OPEN) {
              const bytes = new Uint8Array(pcm16.buffer);
              let binary = "";
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
              const b64 = btoa(binary);
              wsRef.current.send(JSON.stringify({ type: "audio", data: b64 }));
            }
          }

          // Pass through silence to output
          const output = e.outputBuffer.getChannelData(0);
          output.fill(0);
        };

        source.connect(scriptNode);
        scriptNode.connect(ctx.destination);
      }

      return true;
    } catch (err) {
      console.error("Mic capture failed:", err);
      setState((s) => ({
        ...s,
        error: "Не удалось получить доступ к микрофону",
      }));
      return false;
    }
  }, []);

  const stopMicCapture = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    micAnalyserRef.current = null;
    micAudioCtxRef.current = null;
  }, []);

  // ─── Audio Playback ───

  const initPlayback = useCallback(() => {
    if (playbackCtxRef.current) return;
    const ctx = new AudioContext({ sampleRate: 24000 });
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.8;
    analyser.connect(ctx.destination);
    playbackCtxRef.current = ctx;
    analyserNodeRef.current = analyser;
    nextPlayTimeRef.current = 0;
  }, []);

  const playAudioChunk = useCallback((b64Data: string) => {
    if (!playbackCtxRef.current || !analyserNodeRef.current) {
      initPlayback();
    }
    const ctx = playbackCtxRef.current!;
    const analyser = analyserNodeRef.current!;

    // base64 → Int16 → Float32
    const binary = atob(b64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
    }

    // Create buffer and schedule playback
    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(analyser);

    const now = ctx.currentTime;
    const startTime = Math.max(now, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;
    isPlayingRef.current = true;

    source.onended = () => {
      // Check if this was the last queued chunk
      if (ctx.currentTime >= nextPlayTimeRef.current - 0.05) {
        isPlayingRef.current = false;
      }
    };
  }, [initPlayback]);

  const clearPlayback = useCallback(() => {
    playbackQueueRef.current = [];
    isPlayingRef.current = false;
    nextPlayTimeRef.current = 0;
    // Close and recreate context to stop all scheduled sources
    if (playbackCtxRef.current) {
      playbackCtxRef.current.close().catch(() => {});
      playbackCtxRef.current = null;
      analyserNodeRef.current = null;
    }
  }, []);

  // ─── WebSocket Connection ───

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setState((s) => ({ ...s, phase: "connecting", error: null }));

    // Start mic capture first
    const micOk = await startMicCapture();
    if (!micOk) {
      setState((s) => ({ ...s, phase: "idle" }));
      return;
    }

    // Init playback context
    initPlayback();

    // Build WS URL
    const token = getToken();
    if (!token) {
      setState((s) => ({
        ...s,
        phase: "idle",
        error: "Не авторизован",
      }));
      stopMicCapture();
      return;
    }

    const baseUrl = getApiBaseUrl();
    const wsUrl = baseUrl
      .replace(/^http/, "ws")
      .replace(/\/webapp\/api$/, "/webapp/api/ws/interview")
      + `?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      // Phase will change to "idle" when we get "connected" from server
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg: WSIncomingMessage = JSON.parse(event.data);
        handleIncomingMessage(msg);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onerror = () => {
      console.error("WebSocket error");
    };

    ws.onclose = (event: CloseEvent) => {
      wsRef.current = null;

      if (isCleaningUpRef.current) return;

      setState((s) => ({
        ...s,
        isConnected: false,
        phase: "idle",
      }));

      // Auto-reconnect for unexpected closures
      if (
        event.code !== 4001 && // Unauthorized
        event.code !== 4002 && // Replaced
        event.code !== 4003 && // Quota exceeded
        event.code !== 4004 && // No API key
        event.code !== 1000 && // Normal close
        reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
      ) {
        reconnectAttemptsRef.current++;
        setTimeout(() => {
          if (!isCleaningUpRef.current) {
            connect();
          }
        }, RECONNECT_DELAY);
      }
    };
  }, [startMicCapture, stopMicCapture, initPlayback]);

  const handleIncomingMessage = useCallback(
    (msg: WSIncomingMessage) => {
      switch (msg.type) {
        case "connected":
          setState((s) => ({
            ...s,
            isConnected: true,
            phase: "idle",
            error: null,
          }));
          haptic("success");
          break;

        case "audio":
          if (msg.data) {
            playAudioChunk(msg.data);
          }
          break;

        case "ai_transcript":
          if (msg.final) {
            setState((s) => ({
              ...s,
              aiTranscript: msg.text || "",
            }));
          } else {
            setState((s) => ({
              ...s,
              aiTranscript: s.aiTranscript + (msg.text || ""),
            }));
          }
          break;

        case "user_transcript":
          setState((s) => ({
            ...s,
            userTranscript: msg.text || "",
          }));
          break;

        case "status":
          if (msg.phase) {
            setState((s) => {
              const newState = { ...s, phase: msg.phase! };
              if (msg.phase === "listening") {
                // Clear AI transcript when user starts speaking
                newState.aiTranscript = "";
              }
              if (msg.phase === "speaking") {
                // Clear user transcript when AI starts speaking
                newState.userTranscript = "";
                newState.aiTranscript = "";
              }
              return newState;
            });

            if (msg.phase === "listening") haptic("light");
          }
          break;

        case "relative_detected":
          optionsRef.current.onRelativeDetected?.({
            name: msg.name || "",
            probable_role: msg.probable_role || "other",
            context: msg.context || "",
          });
          haptic("medium");
          break;

        case "story_preview":
          optionsRef.current.onStoryPreview?.({
            title: msg.title || "",
            text: msg.text || "",
          });
          haptic("success");
          break;

        case "question_count":
          setState((s) => ({
            ...s,
            questionCount: msg.count ?? s.questionCount,
            canCreateStory: msg.can_create_story ?? s.canCreateStory,
          }));
          optionsRef.current.onQuestionCount?.(
            msg.count ?? 0,
            msg.can_create_story ?? false
          );
          break;

        case "error":
          setState((s) => ({
            ...s,
            error: msg.content || "Произошла ошибка",
          }));
          haptic("error");
          break;
      }
    },
    [playAudioChunk]
  );

  const disconnect = useCallback(() => {
    isCleaningUpRef.current = true;
    stopMicCapture();
    clearPlayback();

    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected");
      wsRef.current = null;
    }

    setState({
      phase: "idle",
      isConnected: false,
      userTranscript: "",
      aiTranscript: "",
      questionCount: 0,
      canCreateStory: false,
      error: null,
    });

    // Reset cleanup flag after a tick
    setTimeout(() => {
      isCleaningUpRef.current = false;
    }, 100);
  }, [stopMicCapture, clearPlayback]);

  const sendText = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && text.trim()) {
      wsRef.current.send(
        JSON.stringify({ type: "text", text: text.trim() })
      );
    }
  }, []);

  const sendStoryAction = useCallback(
    (action: "save" | "discard" | "continue") => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "story_action", action })
        );
      }
    },
    []
  );

  const interrupt = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "control", action: "interrupt" })
      );
    }
    clearPlayback();
    setState((s) => ({ ...s, phase: "idle" }));
  }, [clearPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isCleaningUpRef.current = true;
      stopMicCapture();
      clearPlayback();
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null;
      }
    };
  }, [stopMicCapture, clearPlayback]);

  return {
    state,
    connect,
    disconnect,
    sendText,
    sendStoryAction,
    interrupt,
    micAnalyserRef,
    speakerAnalyserRef: analyserNodeRef,
  };
}
