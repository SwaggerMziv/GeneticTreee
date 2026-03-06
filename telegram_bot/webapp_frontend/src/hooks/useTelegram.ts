"use client";

import { useEffect, useState } from "react";
import { getTelegramWebApp, type TelegramWebApp } from "@/lib/telegram";

/**
 * Ждём загрузки Telegram WebApp SDK.
 *
 * В статическом экспорте Next.js `next/script strategy="beforeInteractive"`
 * загружает скрипт асинхронно через Script loader, а НЕ как блокирующий
 * <script src="...">. Поэтому window.Telegram может быть ещё undefined
 * когда React useEffect запускается. Поллим до 3 секунд.
 */
const MAX_WAIT_MS = 3000;
const POLL_INTERVAL_MS = 50;

export function useTelegram() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [colorScheme, setColorScheme] = useState<"light" | "dark">("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let elapsed = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const check = () => {
      const tg = getTelegramWebApp();
      if (tg) {
        tg.ready();
        tg.expand();
        setWebApp(tg);
        setColorScheme(tg.colorScheme);
        setReady(true);
        return;
      }

      elapsed += POLL_INTERVAL_MS;
      if (elapsed >= MAX_WAIT_MS) {
        // Dev mode — Telegram SDK не загрузился за 3 сек
        setReady(true);
        return;
      }

      timer = setTimeout(check, POLL_INTERVAL_MS);
    };

    check();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  return {
    webApp,
    colorScheme,
    ready,
    initData: webApp?.initData || "",
    // initDataUnsafe.user доступен даже когда initData (подписанная строка) пустая
    user: webApp?.initDataUnsafe?.user || null,
  };
}
