"use client";

import { MessageCircle, BookOpen, BarChart3, Settings } from "lucide-react";
import { haptic } from "@/lib/telegram";

type Tab = "interview" | "stories" | "stats" | "settings";

const tabs: { id: Tab; label: string; icon: typeof MessageCircle }[] = [
  { id: "interview", label: "Интервью", icon: MessageCircle },
  { id: "stories", label: "Истории", icon: BookOpen },
  { id: "stats", label: "Статистика", icon: BarChart3 },
  { id: "settings", label: "Настройки", icon: Settings },
];

export function BottomNav({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  return (
    <nav className="flex shrink-0 border-t border-border bg-card">
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => {
              haptic("selection");
              onChange(id);
            }}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
              isActive
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
