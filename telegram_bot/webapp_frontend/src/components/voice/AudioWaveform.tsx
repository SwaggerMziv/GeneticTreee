"use client";

import { useEffect, useRef } from "react";

interface AudioWaveformProps {
  stream: MediaStream | null;
  isActive: boolean;
  barColor?: string;
  className?: string;
}

/**
 * Canvas-based audio waveform visualization using AnalyserNode.
 * Draws frequency bars from the microphone stream.
 */
export function AudioWaveform({
  stream,
  isActive,
  barColor = "hsl(var(--primary))",
  className = "",
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || !isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Create audio context and analyser
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    analyserRef.current = analyser;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      const { width, height } = canvas;
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, width, height);

      const barCount = Math.min(bufferLength, 24);
      const barWidth = width / barCount - 2;
      const centerY = height / 2;

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i] / 255;
        const barHeight = Math.max(value * centerY * 0.9, 2);

        const x = i * (barWidth + 2) + 1;

        ctx.fillStyle = barColor;
        ctx.globalAlpha = 0.5 + value * 0.5;

        // Draw mirrored bars (up and down from center)
        ctx.beginPath();
        ctx.roundRect(x, centerY - barHeight, barWidth, barHeight * 2, 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      source.disconnect();
      audioCtx.close();
      audioCtxRef.current = null;
      analyserRef.current = null;
    };
  }, [stream, isActive, barColor]);

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={80}
      className={`${className}`}
    />
  );
}
