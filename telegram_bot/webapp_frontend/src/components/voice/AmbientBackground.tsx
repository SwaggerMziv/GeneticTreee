"use client";

type Phase = "idle" | "listening" | "processing" | "speaking";

interface AmbientBackgroundProps {
  phase: Phase;
}

/**
 * Full-screen dark gradient background with slow-moving aurora blobs.
 * Phase-aware: brighter during speaking, dimmer during idle.
 */
export function AmbientBackground({ phase }: AmbientBackgroundProps) {
  const isActive = phase === "speaking" || phase === "listening";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base dark gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(215,15%,4%)] via-[hsl(215,15%,6%)] to-[hsl(215,15%,8%)]" />

      {/* Aurora blob 1 — primary azure */}
      <div
        className={`aurora-blob absolute -left-1/4 -top-1/4 h-[60vh] w-[60vh] rounded-full blur-[100px] transition-opacity duration-1000 ${
          isActive ? "opacity-30" : "opacity-15"
        }`}
        style={{
          background: "radial-gradient(circle, hsl(195 60% 55% / 0.6) 0%, transparent 70%)",
        }}
      />

      {/* Aurora blob 2 — secondary lighter azure */}
      <div
        className={`aurora-blob-alt absolute -bottom-1/4 -right-1/4 h-[50vh] w-[50vh] rounded-full blur-[80px] transition-opacity duration-1000 ${
          isActive ? "opacity-25" : "opacity-10"
        }`}
        style={{
          background: "radial-gradient(circle, hsl(210 50% 60% / 0.5) 0%, transparent 70%)",
        }}
      />

      {/* Subtle center glow during speaking */}
      {phase === "speaking" && (
        <div
          className="absolute left-1/2 top-1/2 h-[40vh] w-[40vh] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] opacity-20 transition-opacity duration-500"
          style={{
            background: "radial-gradient(circle, hsl(195 60% 60% / 0.8) 0%, transparent 60%)",
          }}
        />
      )}
    </div>
  );
}
