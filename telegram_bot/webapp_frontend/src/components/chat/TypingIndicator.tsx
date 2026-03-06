"use client";

export function TypingIndicator({ text }: { text?: string }) {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3">
        {text ? (
          <p className="text-xs text-muted-foreground">{text}</p>
        ) : (
          <div className="flex gap-1">
            <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground" />
            <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground" />
            <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
