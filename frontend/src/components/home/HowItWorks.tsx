'use client'

import { TreePine, Send, Bot, FileText } from 'lucide-react'
import FadeContent from '@/components/ui/FadeContent'

const steps = [
  {
    step: 1,
    icon: TreePine,
    title: 'Создайте древо',
    description: 'Добавьте себя и ближайших родственников. Укажите связи между ними — родители, дети, супруги.',
    color: 'from-orange to-orange-dark',
  },
  {
    step: 2,
    icon: Send,
    title: 'Пригласите через Telegram',
    description: 'Отправьте ссылку-приглашение родственникам. Они перейдут по ней и подключатся к боту.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    step: 3,
    icon: Bot,
    title: 'Бот соберёт истории',
    description: 'ИИ-бот проведёт интервью с каждым родственником, задаст вопросы и запишет воспоминания.',
    color: 'from-purple-500 to-purple-600',
  },
  {
    step: 4,
    icon: FileText,
    title: 'Создайте книгу',
    description: 'Все собранные истории превратятся в красивую PDF-книгу с фотографиями и хронологией.',
    color: 'from-green-500 to-green-600',
  },
]

export default function HowItWorks() {
  return (
    <section className="relative py-24 lg:py-32 bg-background overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-orange/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-orange-dark/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <FadeContent duration={800} threshold={0.2}>
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="font-serif text-5xl lg:text-6xl font-bold mb-6">
              Как это{' '}
              <span className="gradient-text">работает</span>
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              4 простых шага от первого родственника до готовой семейной книги
            </p>
          </div>
        </FadeContent>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((item, index) => (
            <FadeContent key={item.step} duration={800} delay={index * 150} threshold={0.2}>
              <div className="relative group">
                {/* Connecting line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[calc(50%+2rem)] w-[calc(100%-2rem)] h-0.5 bg-gradient-to-r from-border to-border/30" />
                )}

                <div className="text-center">
                  {/* Step number + icon */}
                  <div className="relative inline-flex mb-6">
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                      <item.icon className="w-10 h-10 text-white" strokeWidth={1.5} />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-background border-2 border-orange text-orange font-bold text-sm flex items-center justify-center">
                      {item.step}
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold mb-3 group-hover:text-orange transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {item.description}
                  </p>
                </div>
              </div>
            </FadeContent>
          ))}
        </div>
      </div>
    </section>
  )
}
