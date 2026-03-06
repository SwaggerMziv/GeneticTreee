'use client'

import { useState, useEffect } from 'react'
import { Check, X, Crown, Zap, Infinity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { subscriptionApi } from '@/lib/api/subscription'
import { SubscriptionPlan, PlanType, BillingPeriod, UsageSummary } from '@/types'
import { toast } from 'sonner'

interface PricingCardsProps {
  currentPlan?: PlanType
  usage?: UsageSummary | null
  onCheckout?: (planName: PlanType, period: BillingPeriod) => void
  isLoading?: boolean
}

function formatPrice(kop: number): string {
  return Math.round(kop / 100).toLocaleString('ru-RU')
}

function LimitValue({ value }: { value: number }) {
  if (value === -1) return <Infinity className="w-4 h-4 inline text-azure" />
  if (value === 0) return <X className="w-4 h-4 inline text-muted-foreground/50" />
  return <span>{value}</span>
}

const FEATURE_LABELS: { key: string; label: string }[] = [
  { key: 'max_relatives', label: 'Родственников' },
  { key: 'max_ai_requests_month', label: 'AI-запросов/мес' },
  { key: 'max_ai_smart_requests_month', label: 'AI Smart (GPT-4o)/мес' },
  { key: 'max_tree_generations_month', label: 'Генерация дерева/мес' },
  { key: 'max_book_generations_month', label: 'PDF-книги/мес' },
  { key: 'max_telegram_invitations', label: 'Telegram-приглашений' },
  { key: 'max_telegram_sessions_month', label: 'Telegram-интервью/мес' },
  { key: 'max_storage_mb', label: 'Хранилище' },
  { key: 'max_tts_month', label: 'TTS-озвучка/мес' },
  { key: 'has_gedcom_export', label: 'GEDCOM-экспорт' },
  { key: 'has_priority_support', label: 'Приоритетная поддержка' },
]

function formatStorageLimit(mb: number): string {
  if (mb === -1) return 'Безлимит'
  if (mb >= 1024) return `${(mb / 1024).toFixed(0)} ГБ`
  return `${mb} МБ`
}

export default function PricingCards({ currentPlan, usage, onCheckout, isLoading }: PricingCardsProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [yearly, setYearly] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    subscriptionApi.getPlans()
      .then(setPlans)
      .catch(() => toast.error('Не удалось загрузить тарифы'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse h-96" />
        ))}
      </div>
    )
  }

  const planIcons: Record<string, typeof Crown> = {
    free: Zap,
    pro: Crown,
    premium: Crown,
  }

  return (
    <div className="space-y-6">
      {/* Переключатель месяц/год */}
      <div className="flex items-center justify-center gap-3">
        <span className={cn('text-sm', !yearly && 'font-semibold text-foreground')}>Ежемесячно</span>
        <Switch checked={yearly} onCheckedChange={setYearly} />
        <span className={cn('text-sm', yearly && 'font-semibold text-foreground')}>
          Ежегодно
          <Badge variant="secondary" className="ml-2 text-xs bg-azure/10 text-azure">
            -17%
          </Badge>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = planIcons[plan.name] || Zap
          const isCurrent = currentPlan === plan.name
          const isPro = plan.name === 'pro'
          const price = yearly ? plan.price_yearly_kop : plan.price_monthly_kop
          const periodLabel = yearly ? '/год' : '/мес'

          return (
            <Card
              key={plan.id}
              className={cn(
                'relative flex flex-col',
                isPro && 'border-azure shadow-candy ring-1 ring-azure/20',
              )}
            >
              {isPro && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-azure text-white">
                  Популярный
                </Badge>
              )}

              <CardHeader className="text-center pb-2">
                <div className={cn(
                  'w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3',
                  plan.name === 'free' && 'bg-muted',
                  plan.name === 'pro' && 'bg-azure/10',
                  plan.name === 'premium' && 'bg-amber-100 dark:bg-amber-900/30',
                )}>
                  <Icon className={cn(
                    'w-6 h-6',
                    plan.name === 'free' && 'text-muted-foreground',
                    plan.name === 'pro' && 'text-azure',
                    plan.name === 'premium' && 'text-amber-500',
                  )} />
                </div>
                <CardTitle className="text-xl">{plan.display_name}</CardTitle>
                {plan.description && (
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                )}
                <div className="mt-3">
                  {price === 0 ? (
                    <span className="text-3xl font-bold">Бесплатно</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">{formatPrice(price)} ₽</span>
                      <span className="text-muted-foreground">{periodLabel}</span>
                    </>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-2.5 text-sm">
                  {FEATURE_LABELS.map(({ key, label }) => {
                    const limits = plan.limits as unknown as Record<string, number | boolean>
                    const value = limits[key]

                    if (typeof value === 'boolean') {
                      return (
                        <li key={key} className="flex items-center gap-2">
                          {value ? (
                            <Check className="w-4 h-4 text-azure shrink-0" />
                          ) : (
                            <X className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                          )}
                          <span className={cn(!value && 'text-muted-foreground/60')}>{label}</span>
                        </li>
                      )
                    }

                    const numValue = value as number
                    const isAvailable = numValue !== 0

                    return (
                      <li key={key} className={cn(
                        'flex items-center justify-between',
                        !isAvailable && 'text-muted-foreground/60',
                      )}>
                        <span className="flex items-center gap-2">
                          {isAvailable ? (
                            <Check className="w-4 h-4 text-azure shrink-0" />
                          ) : (
                            <X className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                          )}
                          {label}
                        </span>
                        <span className="font-medium">
                          {key === 'max_storage_mb' ? (
                            formatStorageLimit(numValue)
                          ) : (
                            <LimitValue value={numValue} />
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>

              <CardFooter>
                {isCurrent ? (
                  <Button className="w-full" variant="outline" disabled>
                    Текущий план
                  </Button>
                ) : plan.name === 'free' ? (
                  <Button className="w-full" variant="outline" disabled>
                    Бесплатно
                  </Button>
                ) : (
                  <Button
                    className={cn(
                      'w-full',
                      isPro && 'bg-azure hover:bg-azure-dark text-white',
                      plan.name === 'premium' && 'bg-amber-500 hover:bg-amber-600 text-white',
                    )}
                    onClick={() => onCheckout?.(plan.name, yearly ? 'yearly' : 'monthly')}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Подождите...' : `Выбрать ${plan.display_name}`}
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
