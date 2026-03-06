"use client";

import { X, Image } from "lucide-react";
import type { Story } from "@/lib/types";

export function StoryDetail({
  story,
  onClose,
}: {
  story: Story;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40">
      <div className="flex w-full max-h-[90vh] flex-col rounded-t-2xl bg-background">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-heading text-sm font-semibold line-clamp-1 pr-2">
            {story.title}
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {story.text}
          </p>

          {/* Media gallery */}
          {story.media && story.media.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {story.media.map((m, i) => (
                <div
                  key={i}
                  className="aspect-square overflow-hidden rounded-lg"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {story.created_at && (
            <p className="mt-4 text-xs text-muted-foreground">
              Создано: {new Date(story.created_at).toLocaleDateString("ru-RU")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
