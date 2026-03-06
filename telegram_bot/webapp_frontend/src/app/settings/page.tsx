"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, User } from "lucide-react";
import { getSettings, updateSettings } from "@/lib/api";
import type { Settings } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { haptic } from "@/lib/telegram";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleBroadcast = async () => {
    if (!settings) return;
    const newValue = !settings.broadcast_enabled;
    setSaving(true);
    try {
      await updateSettings({ broadcast_enabled: newValue });
      setSettings({ ...settings, broadcast_enabled: newValue });
      haptic("success");
    } catch {
      haptic("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title="Настройки" />
        <Spinner className="mt-10" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Настройки" />
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-3">
          {/* Account info */}
          {settings?.name && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">{settings.name}</p>
                {settings.added_at && (
                  <p className="text-xs text-muted-foreground">
                    С {new Date(settings.added_at).toLocaleDateString("ru-RU")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Broadcast toggle */}
          <button
            onClick={toggleBroadcast}
            disabled={saving}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/50 disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              {settings?.broadcast_enabled ? (
                <Bell className="h-5 w-5 text-primary" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="text-left">
                <p className="text-sm font-medium">Напоминания</p>
                <p className="text-xs text-muted-foreground">
                  Бот будет присылать вопросы для интервью
                </p>
              </div>
            </div>

            {/* Toggle switch */}
            <div
              className={`relative h-6 w-11 rounded-full transition-colors ${
                settings?.broadcast_enabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  settings?.broadcast_enabled
                    ? "translate-x-[22px]"
                    : "translate-x-0.5"
                }`}
              />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
