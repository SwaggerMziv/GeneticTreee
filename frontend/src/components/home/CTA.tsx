'use client'

import Link from 'next/link'
import { Button } from 'antd'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import FadeContent from '@/components/ui/FadeContent'
import ShinyText from '@/components/ui/ShinyText'

export default function CTA() {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-orange/5 to-transparent" />
        <motion.div
          className="absolute top-1/2 left-1/4 w-72 h-72 bg-orange/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute top-1/3 right-1/4 w-64 h-64 bg-orange-dark/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <FadeContent duration={1000} threshold={0.3}>
          <div className="relative rounded-4xl bg-gradient-to-br from-orange to-orange-dark p-1 shadow-2xl">
            <div className="rounded-4xl bg-charcoal-900 p-12 lg:p-20">
              <div className="max-w-3xl mx-auto text-center">
                {/* Heading */}
                <h2 className="font-serif text-4xl lg:text-6xl font-bold mb-6">
                  Начните создавать семейное древо{' '}
                  <ShinyText duration={3}>прямо сейчас</ShinyText>
                </h2>

                {/* Description */}
                <p className="text-xl text-gray-400 leading-relaxed mb-10">
                  Сохраняйте историю вашей семьи и объединяйте поколения.
                </p>

                {/* CTA Button */}
                <Link href="/auth">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      type="primary"
                      size="large"
                      className="h-14 px-10 text-lg font-semibold shadow-glow-orange hover:shadow-glow-orange transition-all"
                      icon={<ArrowRight className="w-5 h-5" />}
                      iconPosition="end"
                    >
                      Начать бесплатно
                    </Button>
                  </motion.div>
                </Link>
              </div>
            </div>
          </div>
        </FadeContent>
      </div>
    </section>
  )
}
