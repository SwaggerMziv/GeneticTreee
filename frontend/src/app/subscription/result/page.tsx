'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { subscriptionApi } from '@/lib/api/subscription'
import { cn } from '@/lib/utils'

type PaymentStatus = 'loading' | 'succeeded' | 'cancelled' | 'pending'

export default function SubscriptionResultPage() {
  const [status, setStatus] = useState<PaymentStatus>('loading')
  const [syncing, setSyncing] = useState(false)

  async function checkStatus() {
    try {
      const result = await subscriptionApi.syncPayment()

      if (result.status === 'succeeded') return 'succeeded' as const
      if (result.status === 'cancelled') return 'cancelled' as const
      if (result.status === 'no_payments') return 'cancelled' as const
      return 'pending' as const
    } catch {
      try {
        const payments = await subscriptionApi.getPayments(0, 1)
        if (!payments?.length) return 'cancelled' as const
        if (payments[0].status === 'succeeded') return 'succeeded' as const
        if (payments[0].status === 'cancelled') return 'cancelled' as const
        return 'pending' as const
      } catch {
        return 'cancelled' as const
      }
    }
  }

  useEffect(() => {
    checkStatus().then(setStatus)
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
      title: 'Ожидание подтверждения',
      description: 'Платёж обрабатывается платёжной системой. Статус подписки обновится автоматически.',
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
