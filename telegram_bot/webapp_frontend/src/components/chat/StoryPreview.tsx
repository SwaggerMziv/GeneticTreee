"use client";

import { useRef } from "react";
import { BookOpen, Check, X, ArrowRight, Camera, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { PendingStory } from "@/lib/types";
import { haptic } from "@/lib/telegram";

const MAX_PHOTOS = 5;

export function StoryPreview({
  story,
  loading,
  onSave,
  onDiscard,
  onContinue,
  photos,
  onAddPhotos,
  onRemovePhoto,
}: {
  story: PendingStory;
  loading?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onContinue: () => void;
  photos?: File[];
  onAddPhotos?: (files: FileList) => void;
  onRemovePhoto?: (index: number) => void;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40">
      <div className="w-full max-h-[85vh] rounded-t-2xl bg-background flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-sm font-semibold">
            Превью истории
          </h3>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <h4 className="mb-2 font-heading text-base font-semibold">
            {story.title}
          </h4>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-card-foreground">
            {story.text}
          </p>

          {/* Photo section */}
          {onAddPhotos && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Фотографии к истории
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {photos?.map((file, i) => (
                  <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(file)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    {onRemovePhoto && (
                      <button
                        onClick={() => {
                          haptic("light");
                          onRemovePhoto(i);
                        }}
                        className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                {(!photos || photos.length < MAX_PHOTOS) && (
                  <>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          onAddPhotos(e.target.files);
                          e.target.value = "";
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        haptic("light");
                        photoInputRef.current?.click();
                      }}
                      className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:bg-secondary"
                    >
                      {photos && photos.length > 0 ? (
                        <Plus className="h-4 w-4" />
                      ) : (
                        <Camera className="h-5 w-5" />
                      )}
                      <span className="text-[10px]">Фото</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t border-border p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              haptic("light");
              onDiscard();
            }}
            disabled={loading}
            className="flex-1"
          >
            <X className="h-4 w-4" />
            Отклонить
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              haptic("light");
              onContinue();
            }}
            disabled={loading}
            className="flex-1"
          >
            <ArrowRight className="h-4 w-4" />
            Продолжить
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              haptic("success");
              onSave();
            }}
            loading={loading}
            className="flex-1"
          >
            <Check className="h-4 w-4" />
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}
