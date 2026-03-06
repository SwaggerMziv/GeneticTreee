"use client";

import { useCallback, useRef, useState } from "react";

interface PlayResult {
  duration: number;
}

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  play: (audioData: ArrayBuffer) => Promise<PlayResult>;
  stop: () => void;
  analyserRef: React.RefObject<AnalyserNode | null>;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const getAudioContext = useCallback((): AudioContext => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    // iOS requires resume after user gesture
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const stop = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        // Already stopped
      }
      sourceRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const play = useCallback(
    async (audioData: ArrayBuffer): Promise<PlayResult> => {
      stop();

      const ctx = getAudioContext();
      const audioBuffer = await ctx.decodeAudioData(audioData.slice(0));

      // Create analyser node for audio reactivity
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      // Chain: source → analyser → destination
      source.connect(analyser);
      analyser.connect(ctx.destination);

      source.onended = () => {
        setIsPlaying(false);
        sourceRef.current = null;
        analyserRef.current = null;
      };

      sourceRef.current = source;
      setIsPlaying(true);
      source.start(0);

      return { duration: audioBuffer.duration };
    },
    [stop, getAudioContext]
  );

  return { isPlaying, play, stop, analyserRef };
}
