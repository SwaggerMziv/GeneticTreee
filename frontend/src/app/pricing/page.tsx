'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PricingCards from '@/components/subscription/PricingCards'
import { PlanType, BillingPeriod } from '@/types'
import { subscriptionApi } from '@/lib/api/subscription'
import { toast } from 'sonner'

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null)

  async function handleCheckout(planName: PlanType, period: BillingPeriod) {
    setLoadingPlan(planName)
    try {
      const returnUrl = `${window.location.origin}/subscription/success`
      const result = await subscriptionApi.checkout({
        plan_name: planName,
        billing_period: period,
        return_url: returnUrl,
      })
      window.location.href = result.confirmation_url
    } catch {
      toast.error('Войдите в аккаунт для оформления подписки')
      setLoadingPlan(null)
    }
    // Не сбрасываем при успехе — идёт редирект
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-8">
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            На главную
          </Link>
        </Button>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3">Тарифные планы</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Выберите подходящий тариф для сбора семейной истории.
            Начните бесплатно и обновите, когда будет нужно.
          </p>
        </div>

        <PricingCards onCheckout={handleCheckout} loadingPlan={loadingPlan} />
      </div>
    </div>
  )
}
