"use client";

import { useEffect, useRef } from "react";

/**
 * Sets CSS custom property `--audio-level` (0-1) on a DOM element
 * based on AnalyserNode frequency data. Uses requestAnimationFrame
 * and direct DOM manipulation — zero React re-renders.
 */
export function useAudioReactive(
  elementRef: React.RefObject<HTMLElement | null>,
  analyserNode: AnalyserNode | null,
  isActive: boolean
) {
  const rafRef = useRef<number>(0);
  const smoothedRef = useRef(0);

  useEffect(() => {
    if (!isActive || !analyserNode || !elementRef.current) {
      // Reset to 0 when inactive
      if (elementRef.current) {
        elementRef.current.style.setProperty("--audio-level", "0");
      }
      smoothedRef.current = 0;
      return;
    }

    const el = elementRef.current;
    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    const tick = () => {
      analyserNode.getByteFrequencyData(dataArray);

      // Compute normalized amplitude (average of frequency bins)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const raw = sum / (dataArray.length * 255);

      // Exponential moving average for organic feel
      const alpha = 0.3;
      smoothedRef.current = smoothedRef.current * (1 - alpha) + raw * alpha;

      // Clamp to 0-1
      const level = Math.min(1, Math.max(0, smoothedRef.current * 2.5));
      el.style.setProperty("--audio-level", level.toFixed(3));

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      el.style.setProperty("--audio-level", "0");
      smoothedRef.current = 0;
    };
  }, [elementRef, analyserNode, isActive]);
}
