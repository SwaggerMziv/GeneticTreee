"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { getStories } from "@/lib/api";
import type { Story } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { StoryCard } from "@/components/stories/StoryCard";
import { StoryDetail } from "@/components/stories/StoryDetail";
import { Spinner } from "@/components/ui/Spinner";

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Story | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getStories();
      setStories(data.stories || []);
    } catch (error) {
      console.error("Failed to load stories:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Мои истории"
        subtitle={
          stories.length > 0
            ? `${stories.length} ${stories.length === 1 ? "история" : "историй"}`
            : undefined
        }
      />

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <Spinner className="mt-10" />
        ) : stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 pt-20 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Пока нет историй
            </p>
            <p className="text-xs text-muted-foreground/70">
              Пройдите интервью, чтобы создать первую историю
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {stories.map((story) => (
              <StoryCard
                key={story.key}
                story={story}
                onClick={() => setSelected(story)}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <StoryDetail story={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
