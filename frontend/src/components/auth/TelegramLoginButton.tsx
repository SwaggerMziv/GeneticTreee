'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { App } from 'antd'
import { authApi } from '@/lib/api/auth'
import { TelegramAuthData } from '@/types'

interface TelegramLoginButtonProps {
  botUsername: string
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthData) => void
  }
}

export default function TelegramLoginButton({ botUsername }: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { message } = App.useApp()

  useEffect(() => {
    if (!botUsername) return

    window.onTelegramAuth = async (user: TelegramAuthData) => {
      try {
        await authApi.telegramAuth(user)
        message.success('Вход выполнен успешно!')
        router.push('/dashboard')
      } catch (error: any) {
        message.error(error.message || 'Ошибка входа через Telegram')
      }
    }

    if (containerRef.current && !containerRef.current.querySelector('script')) {
      const script = document.createElement('script')
      script.src = 'https://telegram.org/js/telegram-widget.js?22'
      script.async = true
      script.setAttribute('data-telegram-login', botUsername)
      script.setAttribute('data-size', 'large')
      script.setAttribute('data-radius', '12')
      script.setAttribute('data-onauth', 'onTelegramAuth(user)')
      script.setAttribute('data-request-access', 'write')
      containerRef.current.appendChild(script)
    }

    return () => {
      delete window.onTelegramAuth
    }
  }, [botUsername, router])

  if (!botUsername) {
    return (
      <div className="text-center text-gray-500 text-sm py-3">
        Telegram вход не настроен
      </div>
    )
  }

  return <div ref={containerRef} className="flex justify-center" />
}
