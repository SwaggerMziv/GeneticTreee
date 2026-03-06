"use client";

import { BookOpen, Image } from "lucide-react";
import type { Story } from "@/lib/types";

export function StoryCard({
  story,
  onClick,
}: {
  story: Story;
  onClick: () => void;
}) {
  const preview =
    story.text.length > 120
      ? story.text.slice(0, 120) + "..."
      : story.text;

  const mediaCount = story.media?.length || 0;

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:bg-secondary/50 active:scale-[0.98]"
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <h3 className="font-heading text-sm font-semibold line-clamp-1">
          {story.title}
        </h3>
        {mediaCount > 0 && (
          <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
            <Image className="h-3 w-3" />
            {mediaCount}
          </span>
        )}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
        {preview}
      </p>
      {story.created_at && (
        <p className="mt-2 text-[10px] text-muted-foreground/70">
          {new Date(story.created_at).toLocaleDateString("ru-RU")}
        </p>
      )}
    </button>
  );
}
