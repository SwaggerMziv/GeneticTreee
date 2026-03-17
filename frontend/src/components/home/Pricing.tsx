'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PricingCards from '@/components/subscription/PricingCards'
import { PlanType, BillingPeriod } from '@/types'
import { subscriptionApi } from '@/lib/api/subscription'
import { isAuthenticated } from '@/lib/utils'
import { toast } from 'sonner'

export default function Pricing() {
  const router = useRouter()
  const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null)

  async function handleCheckout(planName: PlanType, period: BillingPeriod) {
    if (!isAuthenticated()) {
      router.push('/auth')
      return
    }

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
      toast.error('Не удалось создать платёж. Попробуйте через личный кабинет.')
      setLoadingPlan(null)
    }
  }

  return (
    <section id="pricing" className="py-20 bg-muted/30">
      <div className="container max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">Тарифы</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Начните бесплатно. Обновите тариф, когда ваше семейное древо начнёт расти.
          </p>
        </div>
        <PricingCards onCheckout={handleCheckout} loadingPlan={loadingPlan} />
      </div>
    </section>
  )
}
