'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Clock, CheckCircle2, AlertCircle, CalendarDays } from 'lucide-react'
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

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  active: {
    label: 'Активна',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  cancelled: {
    label: 'Отменена',
    icon: AlertCircle,
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  expired: {
    label: 'Истекла',
    icon: AlertCircle,
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  past_due: {
    label: 'Просрочена',
    icon: AlertCircle,
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
}

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  succeeded: { label: 'Оплачен', className: 'text-emerald-600 border-emerald-200 dark:border-emerald-800/60' },
  pending: { label: 'Ожидание', className: 'text-amber-600 border-amber-200 dark:border-amber-800/60' },
  cancelled: { label: 'Отменён', className: 'text-red-500 border-red-200 dark:border-red-800/60' },
  refunded: { label: 'Возврат', className: 'text-muted-foreground border-border' },
}

export default function SubscriptionPage() {
  const { usage, refreshUsage } = useUser()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutPlanName, setCheckoutPlanName] = useState<PlanType | null>(null)
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
      // Пользователь на FREE плане — данных подписки нет
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckout(planName: PlanType, period: BillingPeriod) {
    setCheckoutPlanName(planName)
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
      setCheckoutPlanName(null)
    }
    // Не сбрасываем loadingPlan при успехе — идёт редирект
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

  const currentPlan = usage?.plan.name ?? 'free'

  // Квоты с реальным лимитом или безлимитные
  const visibleQuotas = usage?.quotas.filter(q => q.is_unlimited || q.limit > 0) ?? []

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Подписка</h1>
        <p className="text-muted-foreground mt-1 text-sm">Управление тарифом, квотами и платёжной историей</p>
      </div>

      {/* Текущая подписка — показываем только если платная и активна */}
      {subscription && subscription.status === 'active' && subscription.plan.name !== 'free' && (
        <Card className="border-azure/30 shadow-pastel">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-azure" />
                Текущая подписка
              </CardTitle>
              {STATUS_CONFIG[subscription.status] && (
                <Badge className={cn('text-xs font-medium', STATUS_CONFIG[subscription.status].className)}>
                  {STATUS_CONFIG[subscription.status].label}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Тариф</p>
                <p className="font-semibold">{subscription.plan.display_name}</p>
              </div>
              {subscription.expires_at && (
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Действует до</p>
                  <p className="font-medium flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                    {new Date(subscription.expires_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Автопродление</p>
                <p className="font-medium">{subscription.auto_renew ? 'Включено' : 'Отключено'}</p>
              </div>
            </div>
            <Separator className="my-4" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={cancelLoading}
              className="text-xs h-8"
            >
              {cancelLoading ? 'Отмена...' : 'Отменить подписку'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Использование квот — компактная сетка */}
      {!loading && visibleQuotas.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Использование
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleQuotas.map(quota => (
              <div
                key={quota.resource}
                className="rounded-xl border border-border/60 bg-card px-4 py-3"
              >
                <QuotaProgress quota={quota} compact />
              </div>
            ))}
          </div>
          {usage && (
            <p className="text-xs text-muted-foreground mt-2">
              Период: {new Date(usage.period_start).toLocaleDateString('ru-RU')} —{' '}
              {new Date(usage.period_end).toLocaleDateString('ru-RU')}
            </p>
          )}
        </div>
      )}

      {/* Выбор тарифа */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Тарифные планы
        </h2>
        <PricingCards
          currentPlan={currentPlan as PlanType}
          usage={usage}
          onCheckout={handleCheckout}
          loadingPlan={checkoutPlanName}
        />
      </div>

      {/* История платежей */}
      {payments.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            История платежей
          </h2>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {payments.map((payment, index) => {
                const statusCfg = PAYMENT_STATUS_CONFIG[payment.status]
                return (
                  <div
                    key={payment.id}
                    className={cn(
                      'flex items-center justify-between px-4 py-3 text-sm',
                      index !== payments.length - 1 && 'border-b border-border/50',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium leading-tight">{payment.description || 'Платёж'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.created_at).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-semibold tabular-nums">
                        {(payment.amount_kop / 100).toFixed(0)} ₽
                      </span>
                      {statusCfg && (
                        <Badge variant="outline" className={cn('text-xs', statusCfg.className)}>
                          {statusCfg.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
