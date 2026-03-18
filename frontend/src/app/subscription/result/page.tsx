'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Clock, Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { subscriptionApi } from '@/lib/api/subscription'
import { cn } from '@/lib/utils'

type PaymentStatus = 'loading' | 'checking' | 'succeeded' | 'cancelled' | 'timeout'

export default function SubscriptionResultPage() {
  const [status, setStatus] = useState<PaymentStatus>('loading')
  const [attempts, setAttempts] = useState(0)

  const MAX_ATTEMPTS = 10
  const POLL_INTERVAL = 3000

  const checkPaymentStatus = useCallback(async () => {
    try {
      // Вызываем sync — backend проверит статус напрямую у ЮKassa
      const result = await subscriptionApi.syncPayment()

      if (result.status === 'succeeded') {
        setStatus('succeeded')
        return 'done'
      }

      if (result.status === 'cancelled') {
        setStatus('cancelled')
        return 'done'
      }

      if (result.status === 'no_payments') {
        setStatus('cancelled')
        return 'done'
      }

      // pending — продолжаем polling
      return 'pending'
    } catch {
      // Если sync недоступен — fallback на getPayments
      try {
        const payments = await subscriptionApi.getPayments(0, 1)
        if (!payments || payments.length === 0) {
          setStatus('cancelled')
          return 'done'
        }
        if (payments[0].status === 'succeeded') {
          setStatus('succeeded')
          return 'done'
        }
        if (payments[0].status === 'cancelled') {
          setStatus('cancelled')
          return 'done'
        }
        return 'pending'
      } catch {
        setStatus('cancelled')
        return 'done'
      }
    }
  }, [])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    async function poll() {
      const result = await checkPaymentStatus()

      if (cancelled) return

      if (result === 'done') return

      // pending — переключаемся в checking и планируем следующую попытку
      setStatus('checking')
      setAttempts(prev => {
        const next = prev + 1
        if (next >= MAX_ATTEMPTS) {
          setStatus('timeout')
          return next
        }
        timer = setTimeout(poll, POLL_INTERVAL)
        return next
      })
    }

    poll()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [checkPaymentStatus])

  const config: Record<Exclude<PaymentStatus, 'loading'>, {
    icon: typeof CheckCircle2
    iconBg: string
    iconColor: string
    title: string
    description: string
  }> = {
    checking: {
      icon: Clock,
      iconBg: 'bg-azure/10 dark:bg-azure/20',
      iconColor: 'text-azure',
      title: 'Проверяем статус оплаты...',
      description: `Ожидание подтверждения от платёжной системы. Попытка ${attempts + 1} из ${MAX_ATTEMPTS}.`,
    },
    succeeded: {
      icon: CheckCircle2,
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600',
      title: 'Оплата прошла успешно!',
      description: 'Ваша подписка активирована. Все расширенные возможности теперь доступны.',
    },
    cancelled: {
      icon: XCircle,
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600',
      title: 'Оплата не завершена',
      description: 'Платёж не был совершён. Вы можете попробовать снова в любое время.',
    },
    timeout: {
      icon: Info,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600',
      title: 'Платёж обрабатывается',
      description: 'Это может занять несколько минут. Статус подписки обновится автоматически.',
    },
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-6 space-y-4">
          {status === 'loading' ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
              </div>
              <p className="text-muted-foreground">Загрузка...</p>
            </div>
          ) : (
            <>
              {(() => {
                const c = config[status]
                const Icon = c.icon
                return (
                  <>
                    <div className={cn(
                      'w-16 h-16 mx-auto rounded-full flex items-center justify-center',
                      c.iconBg,
                    )}>
                      <Icon className={cn(
                        'w-8 h-8',
                        c.iconColor,
                        status === 'checking' && 'animate-pulse',
                      )} />
                    </div>
                    <h1 className="text-2xl font-bold">{c.title}</h1>
                    <p className="text-muted-foreground">{c.description}</p>
                  </>
                )
              })()}

              <div className="flex gap-3 justify-center pt-2">
                <Button asChild className="bg-azure hover:bg-azure-dark text-white">
                  <Link href="/dashboard/subscription">Моя подписка</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/dashboard">На главную</Link>
                </Button>
              </div>

              {status === 'cancelled' && (
                <Button asChild variant="link" className="text-azure">
                  <Link href="/dashboard/subscription">Попробовать снова</Link>
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
