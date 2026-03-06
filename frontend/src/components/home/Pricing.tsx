'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PricingCards from '@/components/subscription/PricingCards'
import { PlanType, BillingPeriod } from '@/types'

export default function Pricing() {
  const router = useRouter()

  function handleCheckout() {
    // На лендинге просто направляем на авторизацию/подписку
    router.push('/auth')
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
        <PricingCards onCheckout={handleCheckout} />
      </div>
    </section>
  )
}
