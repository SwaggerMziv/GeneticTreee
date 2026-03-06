"use client";

import { useRef } from "react";
import { Camera, X } from "lucide-react";
import { haptic } from "@/lib/telegram";

const MAX_PHOTOS = 5;

export function PhotoUploader({
  photos,
  onAdd,
  onRemove,
  disabled,
}: {
  photos: File[];
  onAdd: (files: FileList) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (photos.length === 0 && !disabled) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              onAdd(e.target.files);
              e.target.value = "";
            }
          }}
        />
        <button
          onClick={() => {
            haptic("light");
            inputRef.current?.click();
          }}
          disabled={disabled}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary disabled:opacity-50"
        >
          <Camera className="h-5 w-5" />
        </button>
      </>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {photos.map((file, i) => (
        <div key={i} className="relative h-10 w-10 overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={URL.createObjectURL(file)}
            alt=""
            className="h-full w-full object-cover"
          />
          <button
            onClick={() => {
              haptic("light");
              onRemove(i);
            }}
            className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ))}
      {photos.length < MAX_PHOTOS && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                onAdd(e.target.files);
                e.target.value = "";
              }
            }}
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground hover:bg-secondary"
          >
            <Camera className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
