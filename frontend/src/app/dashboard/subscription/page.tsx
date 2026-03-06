'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useUser } from '@/components/providers/UserProvider'
import PricingCards from '@/components/subscription/PricingCards'
import QuotaProgress from '@/components/subscription/QuotaProgress'
import { subscriptionApi } from '@/lib/api/subscription'
import { UserSubscription, PaymentRecord, PlanType, BillingPeriod } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Активна', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  cancelled: { label: 'Отменена', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  expired: { label: 'Истекла', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  past_due: { label: 'Просрочена', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

export default function SubscriptionPage() {
  const { usage, refreshUsage } = useUser()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [sub, pay] = await Promise.all([
        subscriptionApi.getMy(),
        subscriptionApi.getPayments(),
      ])
      setSubscription(sub)
      setPayments(pay)
    } catch {
      // Пользователь на FREE плане
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckout(planName: PlanType, period: BillingPeriod) {
    setCheckoutLoading(true)
    try {
      const returnUrl = `${window.location.origin}/subscription/success`
      const result = await subscriptionApi.checkout({
        plan_name: planName,
        billing_period: period,
        return_url: returnUrl,
      })
      window.location.href = result.confirmation_url
    } catch (error: unknown) {
      const msg = error && typeof error === 'object' && 'detail' in error
        ? String((error as { detail: string }).detail)
        : 'Ошибка создания платежа'
      toast.error(msg)
    } finally {
      setCheckoutLoading(false)
    }
  }

  async function handleCancel() {
    setCancelLoading(true)
    try {
      await subscriptionApi.cancel()
      toast.success('Подписка отменена. Она будет действовать до конца оплаченного периода.')
      await loadData()
      await refreshUsage()
    } catch {
      toast.error('Не удалось отменить подписку')
    } finally {
      setCancelLoading(false)
    }
  }

  const currentPlan = usage?.plan.name || 'free'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Подписка</h1>
        <p className="text-muted-foreground mt-1">Управление тарифом и квотами</p>
      </div>

      {/* Текущая подписка */}
      {subscription && subscription.status === 'active' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-azure" />
                Текущая подписка
              </CardTitle>
              <Badge className={cn(STATUS_LABELS[subscription.status]?.color)}>
                {STATUS_LABELS[subscription.status]?.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Тариф</span>
              <span className="font-medium">{subscription.plan.display_name}</span>
            </div>
            {subscription.expires_at && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Действует до</span>
                <span>{new Date(subscription.expires_at).toLocaleDateString('ru-RU')}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Автопродление</span>
              <span>{subscription.auto_renew ? 'Включено' : 'Отключено'}</span>
            </div>
            {subscription.status === 'active' && subscription.plan.name !== 'free' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={cancelLoading}
                className="mt-2"
              >
                {cancelLoading ? 'Отмена...' : 'Отменить подписку'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Использование квот */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Использование</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {usage.quotas
              .filter(q => q.limit !== 0 || q.is_unlimited)
              .map(quota => (
                <QuotaProgress key={quota.resource} quota={quota} />
              ))}
            <Separator />
            <p className="text-xs text-muted-foreground">
              Период: {new Date(usage.period_start).toLocaleDateString('ru-RU')} —{' '}
              {new Date(usage.period_end).toLocaleDateString('ru-RU')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Выбор тарифа */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Тарифные планы</h2>
        <PricingCards
          currentPlan={currentPlan as PlanType}
          usage={usage}
          onCheckout={handleCheckout}
          isLoading={checkoutLoading}
        />
      </div>

      {/* История платежей */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              История платежей
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.map(payment => (
                <div key={payment.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{payment.description || 'Платёж'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payment.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {(payment.amount_kop / 100).toFixed(0)} ₽
                    </p>
                    <Badge variant="outline" className={cn(
                      'text-xs',
                      payment.status === 'succeeded' && 'text-green-600 border-green-200',
                      payment.status === 'pending' && 'text-amber-600 border-amber-200',
                      payment.status === 'cancelled' && 'text-red-600 border-red-200',
                    )}>
                      {payment.status === 'succeeded' && 'Оплачен'}
                      {payment.status === 'pending' && 'Ожидание'}
                      {payment.status === 'cancelled' && 'Отменён'}
                      {payment.status === 'refunded' && 'Возврат'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
