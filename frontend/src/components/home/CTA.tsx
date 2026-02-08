'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import FadeContent from '@/components/ui/FadeContent'

export default function CTA() {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-orange/5 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <FadeContent duration={1000} threshold={0.3}>
          <div className="relative rounded-3xl bg-gradient-to-br from-orange to-orange-dark p-1 shadow-2xl">
            <div className="rounded-3xl bg-background p-12 lg:p-20">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="font-serif text-4xl lg:text-6xl font-bold mb-6">
                  Начните создавать семейную книгу{' '}
                  <span className="gradient-text">прямо сейчас</span>
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed mb-10">
                  Соберите истории вашей семьи, пока они ещё живы в памяти.
                </p>
                <Link href="/auth">
                  <Button
                    className="h-14 px-10 text-lg font-semibold bg-gradient-to-r from-orange to-orange-dark text-white hover:shadow-glow-orange hover:scale-105 transition-all duration-300"
                  >
                    Начать бесплатно
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </FadeContent>
      </div>
    </section>
  )
}
