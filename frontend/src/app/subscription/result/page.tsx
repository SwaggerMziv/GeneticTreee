'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { subscriptionApi } from '@/lib/api/subscription'
import { cn } from '@/lib/utils'

type PaymentStatus = 'loading' | 'succeeded' | 'cancelled' | 'pending'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

export default function SubscriptionResultPage() {
  const [status, setStatus] = useState<PaymentStatus>('loading')
  const [syncing, setSyncing] = useState(false)

  // Один вызов sync. Если API недоступен (нет авторизации / другой браузер) → pending, не cancelled.
  async function checkStatus(): Promise<PaymentStatus> {
    try {
      const result = await subscriptionApi.syncPayment()

      if (result.status === 'succeeded') return 'succeeded'
      if (result.status === 'cancelled') return 'cancelled'
      if (result.status === 'no_payments') return 'cancelled'
      return 'pending'
    } catch {
      // API недоступен (401 / другой браузер без авторизации) → показываем pending,
      // потому что платёж мог пройти — просто мы не можем это проверить отсюда.
      return 'pending'
    }
  }

  useEffect(() => {
    async function init() {
      const first = await checkStatus()

      // Если pending — подождём 3 сек и попробуем ещё раз (ЮКасса может ещё обрабатывать)
      if (first === 'pending') {
        setStatus('pending')
        await delay(3000)
        const second = await checkStatus()
        setStatus(second)
      } else {
        setStatus(first)
      }
    }
    init()
  }, [])

  async function handleRetrySync() {
    setSyncing(true)
    const result = await checkStatus()
    setStatus(result)
    setSyncing(false)
  }

  const config: Record<Exclude<PaymentStatus, 'loading'>, {
    icon: typeof CheckCircle2
    iconBg: string
    iconColor: string
    title: string
    description: string
  }> = {
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
    pending: {
      icon: Clock,
      iconBg: 'bg-azure/10 dark:bg-azure/20',
      iconColor: 'text-azure',
      title: 'Оплата обрабатывается',
      description: 'Платёж принят платёжной системой. Проверьте статус подписки в личном кабинете.',
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
              <p className="text-muted-foreground">Проверяем статус оплаты...</p>
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
                      <Icon className={cn('w-8 h-8', c.iconColor)} />
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

              {status === 'pending' && (
                <Button
                  variant="link"
                  className="text-azure"
                  onClick={handleRetrySync}
                  disabled={syncing}
                >
                  {syncing ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Проверяем...</>
                  ) : (
                    'Проверить снова'
                  )}
                </Button>
              )}

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
