'use client'

import { useState, useEffect } from 'react'
import { Check, Crown, Zap, Star, Infinity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { subscriptionApi } from '@/lib/api/subscription'
import { SubscriptionPlan, PlanType, BillingPeriod, UsageSummary } from '@/types'

// Статические тарифы — показываются при недоступности API
const STATIC_PLANS: SubscriptionPlan[] = [
  {
    id: 1,
    name: 'free',
    display_name: 'Бесплатный',
    description: 'Базовый доступ для знакомства с платформой',
    price_monthly_kop: 0,
    price_yearly_kop: 0,
    limits: {
      max_relatives: 15,
      max_ai_requests_month: 10,
      max_ai_smart_requests_month: 0,
      max_tree_generations_month: 2,
      max_book_generations_month: 0,
      max_telegram_invitations: 3,
      max_telegram_sessions_month: 5,
      max_storage_mb: 50,
      max_tts_month: 0,
      has_gedcom_export: false,
      has_priority_support: false,
    },
    sort_order: 0,
  },
  {
    id: 2,
    name: 'pro',
    display_name: 'Pro',
    description: 'Для активного сбора семейной истории',
    price_monthly_kop: 100,
    price_yearly_kop: 100,
    limits: {
      max_relatives: 100,
      max_ai_requests_month: 100,
      max_ai_smart_requests_month: 10,
      max_tree_generations_month: 20,
      max_book_generations_month: 3,
      max_telegram_invitations: 20,
      max_telegram_sessions_month: 50,
      max_storage_mb: 500,
      max_tts_month: 5,
      has_gedcom_export: true,
      has_priority_support: false,
    },
    sort_order: 1,
  },
  {
    id: 3,
    name: 'premium',
    display_name: 'Premium',
    description: 'Максимум возможностей для всей семьи',
    price_monthly_kop: 100,
    price_yearly_kop: 100,
    limits: {
      max_relatives: -1,
      max_ai_requests_month: -1,
      max_ai_smart_requests_month: 50,
      max_tree_generations_month: -1,
      max_book_generations_month: 10,
      max_telegram_invitations: -1,
      max_telegram_sessions_month: -1,
      max_storage_mb: 5120,
      max_tts_month: 30,
      has_gedcom_export: true,
      has_priority_support: true,
    },
    sort_order: 2,
  },
]

interface PricingCardsProps {
  currentPlan?: PlanType
  usage?: UsageSummary | null
  onCheckout?: (planName: PlanType, period: BillingPeriod) => void
  loadingPlan?: PlanType | null
}

function formatPrice(kop: number): string {
  return Math.round(kop / 100).toLocaleString('ru-RU')
}

function formatStorageLimit(mb: number): string {
  if (mb === -1) return 'Безлимит'
  if (mb >= 1024) return `${(mb / 1024).toFixed(0)} ГБ`
  return `${mb} МБ`
}

function LimitText({ value, isStorage }: { value: number; isStorage?: boolean }) {
  if (value === -1) return (
    <span className="flex items-center gap-0.5">
      <Infinity className="w-3.5 h-3.5" />
    </span>
  )
  if (isStorage) return <span>{formatStorageLimit(value)}</span>
  return <span>{value}</span>
}

// Сгруппированные фичи — показываем только те, у которых значение > 0 или is boolean true
interface FeatureGroup {
  label: string
  key: keyof typeof STATIC_PLANS[0]['limits']
  isStorage?: boolean
  isBoolean?: boolean
}

const FEATURE_GROUPS: FeatureGroup[] = [
  { key: 'max_relatives', label: 'Родственников в дереве' },
  { key: 'max_ai_requests_month', label: 'AI-запросов в месяц' },
  { key: 'max_ai_smart_requests_month', label: 'AI Smart (GPT-4o)' },
  { key: 'max_book_generations_month', label: 'PDF-книг в месяц' },
  { key: 'max_telegram_invitations', label: 'Telegram-приглашений' },
  { key: 'max_telegram_sessions_month', label: 'Telegram-интервью' },
  { key: 'max_storage_mb', label: 'Хранилище', isStorage: true },
  { key: 'max_tts_month', label: 'Озвучка историй' },
  { key: 'max_tree_generations_month', label: 'Генерация дерева' },
  { key: 'has_gedcom_export', label: 'Экспорт GEDCOM', isBoolean: true },
  { key: 'has_priority_support', label: 'Приоритетная поддержка', isBoolean: true },
]

interface PlanConfig {
  icon: typeof Crown
  gradient: string
  iconBg: string
  iconColor: string
  badge?: string
  badgeClass?: string
  buttonClass: string
  cardClass: string
  checkColor: string
}

const PLAN_CONFIG: Record<PlanType, PlanConfig> = {
  free: {
    icon: Zap,
    gradient: '',
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    buttonClass: 'border-border hover:bg-muted',
    cardClass: 'border-border/60 bg-card',
    checkColor: 'text-muted-foreground',
  },
  pro: {
    icon: Crown,
    gradient: 'from-azure/5 via-azure/10 to-azure-light/5',
    iconBg: 'bg-azure/15',
    iconColor: 'text-azure',
    badge: 'Популярный',
    badgeClass: 'bg-azure text-white shadow-candy',
    buttonClass: 'bg-azure hover:bg-azure-dark text-white shadow-candy hover:shadow-md',
    cardClass: 'border-azure/40 shadow-candy ring-1 ring-azure/20',
    checkColor: 'text-azure',
  },
  premium: {
    icon: Star,
    gradient: 'from-amber-50/80 via-amber-50/40 to-orange-50/20 dark:from-amber-900/10 dark:via-amber-900/5 dark:to-transparent',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-500',
    buttonClass: 'bg-amber-500 hover:bg-amber-600 text-white shadow-warm hover:shadow-md',
    cardClass: 'border-amber-200/70 dark:border-amber-800/40 shadow-warm',
    checkColor: 'text-amber-500',
  },
}

export default function PricingCards({ currentPlan, usage: _usage, onCheckout, loadingPlan }: PricingCardsProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [yearly, setYearly] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    subscriptionApi.getPlans()
      .then(setPlans)
      .catch(() => setPlans(STATIC_PLANS))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-3xl border border-border/40 bg-card h-[480px] animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Переключатель месяц/год */}
      <div className="flex items-center justify-center gap-3">
        <span className={cn(
          'text-sm transition-colors',
          !yearly ? 'font-semibold text-foreground' : 'text-muted-foreground',
        )}>
          Ежемесячно
        </span>
        <Switch
          checked={yearly}
          onCheckedChange={setYearly}
          className="data-[state=checked]:bg-azure"
        />
        <span className={cn(
          'text-sm transition-colors flex items-center gap-2',
          yearly ? 'font-semibold text-foreground' : 'text-muted-foreground',
        )}>
          Ежегодно
          <Badge className="text-xs bg-azure/10 text-azure border-azure/20 font-medium">
            −17%
          </Badge>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const config = PLAN_CONFIG[plan.name] ?? PLAN_CONFIG.free
          const Icon = config.icon
          const isCurrent = currentPlan === plan.name
          const isThisLoading = loadingPlan === plan.name
          const price = yearly ? plan.price_yearly_kop : plan.price_monthly_kop
          const periodLabel = yearly ? '/год' : '/мес'
          const limits = plan.limits as unknown as Record<string, number | boolean>

          // Фильтруем фичи: убираем булевые false и числовые 0
          const visibleFeatures = FEATURE_GROUPS.filter(({ key, isBoolean }) => {
            const val = limits[key]
            if (isBoolean) return val === true
            return (val as number) !== 0
          })

          return (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col rounded-3xl border bg-gradient-to-b p-6 transition-all duration-200',
                config.gradient,
                config.cardClass,
                plan.name === 'free' && 'opacity-90 hover:opacity-100',
                plan.name !== 'free' && 'hover:-translate-y-0.5 hover:shadow-lg',
              )}
            >
              {/* Популярный badge */}
              {config.badge && (
                <Badge className={cn(
                  'absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-semibold',
                  config.badgeClass,
                )}>
                  {config.badge}
                </Badge>
              )}

              {/* Текущий план indicator */}
              {isCurrent && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs bg-muted text-muted-foreground border border-border">
                  Текущий план
                </Badge>
              )}

              {/* Шапка */}
              <div className="flex items-start gap-4 mb-5">
                <div className={cn(
                  'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0',
                  config.iconBg,
                )}>
                  <Icon className={cn('w-5 h-5', config.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base leading-tight">{plan.display_name}</h3>
                  {plan.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{plan.description}</p>
                  )}
                </div>
              </div>

              {/* Цена */}
              <div className="mb-5">
                {price === 0 ? (
                  <div className="text-2xl font-bold">Бесплатно</div>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{formatPrice(price)} ₽</span>
                    <span className="text-sm text-muted-foreground">{periodLabel}</span>
                  </div>
                )}
              </div>

              {/* Список фич */}
              <ul className="flex-1 space-y-2 mb-6">
                {visibleFeatures.map(({ key, label, isStorage, isBoolean }) => {
                  const val = limits[key]
                  return (
                    <li key={key} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 text-foreground/80">
                        <Check className={cn('w-3.5 h-3.5 shrink-0', config.checkColor)} />
                        {label}
                      </span>
                      {!isBoolean && (
                        <span className="font-medium text-foreground shrink-0">
                          <LimitText value={val as number} isStorage={isStorage} />
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>

              {/* Кнопка */}
              {isCurrent ? (
                <button
                  className="w-full rounded-xl border border-border/60 bg-muted/60 py-2 text-sm text-muted-foreground cursor-default"
                  disabled
                >
                  Ваш текущий план
                </button>
              ) : plan.name === 'free' ? (
                <button
                  className="w-full rounded-xl border border-border/60 bg-muted/60 py-2 text-sm text-muted-foreground cursor-default"
                  disabled
                >
                  Бесплатно
                </button>
              ) : (
                <Button
                  className={cn('w-full rounded-xl', config.buttonClass)}
                  onClick={() => onCheckout?.(plan.name, yearly ? 'yearly' : 'monthly')}
                  disabled={loadingPlan !== null && loadingPlan !== undefined}
                >
                  {isThisLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      Подождите...
                    </span>
                  ) : (
                    `Выбрать ${plan.display_name}`
                  )}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
