'use client'

import { Check } from 'lucide-react'
import { Button } from 'antd'
import Link from 'next/link'
import FadeContent from '@/components/ui/FadeContent'
import { motion } from 'framer-motion'

interface PricingPlan {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  highlighted?: boolean
  buttonText: string
}

const pricingPlans: PricingPlan[] = [
  {
    name: 'Free',
    price: '0 ₽',
    period: 'навсегда',
    description: 'Идеально для начала работы с семейным древом',
    features: [
      'До 50 родственников',
      'Базовое семейное древо',
      'Загрузка фотографий',
      '5 историй в месяц',
      'Экспорт в PDF',
    ],
    buttonText: 'Начать бесплатно',
  },
  {
    name: 'Standard',
    price: '299 ₽',
    period: 'в месяц',
    description: 'Для семей, которые хотят сохранить больше',
    features: [
      'До 500 родственников',
      'Расширенное семейное древо',
      'Неограниченные фотографии',
      'Неограниченные истории',
      'Telegram бот интеграция',
      'Приоритетная поддержка',
    ],
    highlighted: true,
    buttonText: 'Выбрать Standard',
  },
  {
    name: 'Pro',
    price: '599 ₽',
    period: 'в месяц',
    description: 'Максимальные возможности для больших семей',
    features: [
      'Неограниченное количество родственников',
      'Все функции Standard',
      'Совместный доступ для семьи',
      'Расширенная аналитика',
      'API доступ',
      'Персональный менеджер',
      'Резервное копирование данных',
    ],
    buttonText: 'Выбрать Pro',
  },
]

const PricingCard = ({ plan, index }: { plan: PricingPlan; index: number }) => {
  return (
    <FadeContent duration={800} delay={index * 150} threshold={0.2}>
      <motion.div
        whileHover={{ y: -8 }}
        className={`relative rounded-3xl p-8 h-full flex flex-col ${
          plan.highlighted
            ? 'bg-gradient-to-b from-orange/20 to-charcoal-800 border-2 border-orange'
            : 'bg-charcoal-800 border border-charcoal-700'
        }`}
      >
        {plan.highlighted && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <span className="px-4 py-1 rounded-full bg-orange text-white text-sm font-semibold">
              Популярный
            </span>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
          <p className="text-gray-400 text-sm">{plan.description}</p>
        </div>

        <div className="mb-6">
          <span className="text-4xl font-bold">{plan.price}</span>
          <span className="text-gray-400 ml-2">/ {plan.period}</span>
        </div>

        <ul className="space-y-3 mb-8 flex-1">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-orange flex-shrink-0 mt-0.5" />
              <span className="text-gray-300 text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        <Link href="/auth">
          <Button
            type={plan.highlighted ? 'primary' : 'default'}
            size="large"
            block
            className={plan.highlighted ? 'shadow-glow-orange h-12' : 'h-12'}
          >
            {plan.buttonText}
          </Button>
        </Link>
      </motion.div>
    </FadeContent>
  )
}

export default function Pricing() {
  return (
    <section className="relative py-24 lg:py-32 bg-charcoal-900 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-orange/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-orange-dark/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <FadeContent duration={800} threshold={0.2}>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-serif text-5xl lg:text-6xl font-bold mb-6">
              Выберите{' '}
              <span className="gradient-text">подходящий план</span>
            </h2>
            <p className="text-xl text-gray-400 leading-relaxed">
              Начните бесплатно и обновитесь, когда будете готовы получить больше возможностей
            </p>
          </div>
        </FadeContent>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {pricingPlans.map((plan, index) => (
            <PricingCard key={plan.name} plan={plan} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
