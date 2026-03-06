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

    const doAuth = async () => {
      const hasTelegramSDK = !!webApp;
      const hasInitData = !!initData;
      const hasStoredToken = !!getToken();

      const apiUrl = getApiBaseUrl();
      const info = [
        `SDK: ${hasTelegramSDK ? "да" : "нет"}`,
        `initData: ${hasInitData ? "да" : "нет"}`,
        `token (session): ${hasStoredToken ? "да" : "нет"}`,
        `API: ${apiUrl}`,
      ].join(", ");
      setDebugInfo(info);

      console.log("[Auth]", info);

      const errors: string[] = [];

      try {
        // 1. Если есть initData от Telegram — авторизуемся через неё
        if (initData) {
          console.log("[Auth] Авторизация через initData...");
          try {
            const result = await authenticate(initData);
            setAuth(result);
            setLoading(false);
            return;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn("[Auth] initData auth failed:", msg);
            errors.push(`initData: ${msg}`);
          }
        }

        // 2. Если есть сохранённый токен в sessionStorage — пробуем его
        if (hasStoredToken) {
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

        // 3. Нет initData и нет токена
        if (!hasTelegramSDK) {
          // Вне Telegram — dev mode
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

        // 4. Fallback через user.id из SDK (работает когда initData пуст, но SDK есть)
        const tgUserId = user?.id || (() => {
          // Fallback: читаем tg_id из URL-параметра (бот передаёт при ngrok/dev)
          if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const id = params.get("tg_id");
            return id ? Number(id) : null;
          }
          return null;
        })();

        if (tgUserId) {
          console.log("[Auth] Fallback: авторизация по telegram_user_id...", tgUserId);
          try {
            const result = await authenticateByTelegramId(tgUserId);
            setAuth(result);
            setLoading(false);
            return;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error("[Auth] Fallback auth failed:", msg);
            errors.push(`fallback (tg_id=${tgUserId}): ${msg}`);
          }
        }

        // 5. Совсем ничего не сработало — показываем ошибку
        console.error("[Auth] Все методы авторизации исчерпаны");
        const errorDetail = errors.length > 0
          ? `\n\nОшибки:\n${errors.join("\n")}`
          : "";
        setAuthError(
          "Не удалось авторизоваться.\n\n" +
          "Попробуйте закрыть приложение и открыть заново через кнопку «🌳 Открыть приложение» в боте." +
          errorDetail
        );
      } catch (err) {
        console.error("[Auth] Ошибка:", err);
        setAuthError(
          err instanceof Error
            ? err.message
            : "Ошибка авторизации"
        );
      } finally {
        setLoading(false);
      }
    };

    doAuth();

    // Set re-auth handler
    setOnAuthRequired(async () => {
      if (initData) {
        try {
          const result = await authenticate(initData);
          setAuth(result);
        } catch (e) {
          console.error("[Auth] Re-auth failed:", e);
          clearToken();
          setAuthError("Сессия истекла. Закройте и откройте приложение заново.");
        }
      }
    });
  }, [ready, initData, webApp]);

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
