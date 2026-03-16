"use client";

import { useEffect, useState } from "react";
import { useTelegram } from "@/hooks/useTelegram";
import { authenticate, authenticateByTelegramId, setOnAuthRequired, getToken, clearToken, getApiBaseUrl } from "@/lib/api";
import type { AuthResponse } from "@/lib/types";
import { getTelegramWebApp } from "@/lib/telegram";
import { BottomNav } from "@/components/layout/BottomNav";
import InterviewPage from "@/app/interview/page";
import StoriesPage from "@/app/stories/page";
import StatsPage from "@/app/stats/page";
import SettingsPage from "@/app/settings/page";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";

type Tab = "interview" | "stories" | "stats" | "settings";

export default function HomePage() {
  const { ready, initData, webApp, user } = useTelegram();
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("webapp_activeTab");
      if (saved && ["interview", "stories", "stats", "settings"].includes(saved)) {
        return saved as Tab;
      }
    }
    return "interview";
  });

  // Apply Telegram theme
  useEffect(() => {
    const tg = getTelegramWebApp();
    if (tg) {
      const isDark = tg.colorScheme === "dark";
      document.documentElement.classList.toggle("dark", isDark);
    }
  }, [ready]);

  // Auth
  useEffect(() => {
    if (!ready) return;

    /** Получить telegram_user_id из SDK или URL-параметра */
    const getTelegramUserId = (): number | null => {
      if (user?.id) return user.id;
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("tg_id");
        return id ? Number(id) : null;
      }
      return null;
    };

    /** Попытка авторизации через initData (HMAC) */
    const tryInitDataAuth = async (): Promise<AuthResponse | null> => {
      if (!initData) return null;
      try {
        return await authenticate(initData);
      } catch (e) {
        console.warn("[Auth] initData auth failed:", e instanceof Error ? e.message : e);
        return null;
      }
    };

    /** Попытка авторизации по telegram_user_id (fallback) */
    const tryFallbackAuth = async (): Promise<AuthResponse | null> => {
      const tgUserId = getTelegramUserId();
      if (!tgUserId) return null;
      try {
        return await authenticateByTelegramId(tgUserId);
      } catch (e) {
        console.warn("[Auth] Fallback auth failed:", e instanceof Error ? e.message : e);
        return null;
      }
    };

    const doAuth = async () => {
      const hasTelegramSDK = !!webApp;
      const hasInitData = !!initData;

      const apiUrl = getApiBaseUrl();
      const info = [
        `SDK: ${hasTelegramSDK ? "да" : "нет"}`,
        `initData: ${hasInitData ? "да" : "нет"}`,
        `user.id: ${user?.id || "нет"}`,
        `API: ${apiUrl}`,
      ].join(", ");
      setDebugInfo(info);
      console.log("[Auth]", info);

      try {
        // 1. initData (HMAC-подпись от Telegram) — самый надёжный способ
        const initDataResult = await tryInitDataAuth();
        if (initDataResult) {
          setAuth(initDataResult);
          setLoading(false);
          return;
        }

        // 2. Fallback по telegram_user_id (из SDK или URL ?tg_id=)
        const fallbackResult = await tryFallbackAuth();
        if (fallbackResult) {
          setAuth(fallbackResult);
          setLoading(false);
          return;
        }

        // 3. Сохранённый токен — последний шанс (без верификации на сервере)
        if (getToken()) {
          console.log("[Auth] Используем сохранённый токен...");
          setAuth({
            token: getToken()!,
            relative_id: 0,
            telegram_user_id: 0,
            first_name: "",
            last_name: "",
            relative_name: "",
          });
          setLoading(false);
          return;
        }

        // 4. Dev mode — вне Telegram
        if (!hasTelegramSDK) {
          console.log("[Auth] Dev mode (нет Telegram SDK)");
          setAuth({
            token: "dev",
            relative_id: 0,
            telegram_user_id: 0,
            first_name: "Dev",
            last_name: "User",
            relative_name: "Dev User",
          });
          setLoading(false);
          return;
        }

        // 5. Все методы исчерпаны
        console.error("[Auth] Все методы авторизации исчерпаны");
        setAuthError(
          "Не удалось авторизоваться.\n\n" +
          "Попробуйте закрыть приложение и открыть заново через кнопку «🌳 Открыть приложение» в боте."
        );
      } catch (err) {
        console.error("[Auth] Ошибка:", err);
        setAuthError(
          err instanceof Error ? err.message : "Ошибка авторизации"
        );
      } finally {
        setLoading(false);
      }
    };

    doAuth();

    // Re-auth handler: пробуем initData, затем fallback
    setOnAuthRequired(async () => {
      const result = await tryInitDataAuth() || await tryFallbackAuth();
      if (result) {
        setAuth(result);
      } else {
        clearToken();
        setAuthError("Сессия истекла. Закройте и откройте приложение заново.");
      }
    });
  }, [ready, initData, webApp, user]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold">Не удалось войти</h2>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{authError}</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            <RefreshCw className="h-4 w-4" />
            Попробовать снова
          </button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground/60">
          {debugInfo}
        </p>
      </div>
    );
  }

  if (!auth) return null;

  const handleSetTab = (tab: Tab) => {
    setActiveTab(tab);
    sessionStorage.setItem("webapp_activeTab", tab);
  };

  return (
    <>
      <div className="flex-1 overflow-hidden">
        <div className={activeTab === "interview" ? "h-full" : "hidden"}>
          <InterviewPage />
        </div>
        <div className={activeTab === "stories" ? "h-full" : "hidden"}>
          <StoriesPage />
        </div>
        <div className={activeTab === "stats" ? "h-full" : "hidden"}>
          <StatsPage />
        </div>
        <div className={activeTab === "settings" ? "h-full" : "hidden"}>
          <SettingsPage />
        </div>
      </div>
      <BottomNav active={activeTab} onChange={handleSetTab} />
    </>
  );
}
