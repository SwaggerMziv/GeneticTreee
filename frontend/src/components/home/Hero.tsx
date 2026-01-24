'use client'

import Link from 'next/link'
import { Button } from 'antd'
import { ArrowRight, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import ShinyText from '@/components/ui/ShinyText'
import GradientBackground from '@/components/ui/GradientBackground'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Animated Background */}
      <GradientBackground />

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-32">
        <div className="text-center max-w-5xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-charcoal-800/80 backdrop-blur-sm border border-charcoal-700 mb-8"
          >
            <Sparkles className="w-4 h-4 text-orange animate-pulse" />
            <span className="text-sm text-gray-300 font-medium">
              Создайте историю вашей семьи
            </span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-serif text-6xl sm:text-7xl lg:text-8xl font-bold leading-tight mb-8"
          >
            Семейное древо,
            <br />
            <ShinyText duration={4} animationDelay={0.5}>
              сохранённое навсегда
            </ShinyText>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl sm:text-2xl text-gray-400 leading-relaxed mb-12 max-w-3xl mx-auto"
          >
            Управляйте семейным древом с помощью современного приложения
            с интеграцией Telegram для совместной работы с родственниками.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/auth">
              <Button
                type="primary"
                size="large"
                className="h-14 px-8 text-lg font-semibold shadow-glow-orange hover:shadow-glow-orange hover:scale-105 transition-all duration-300"
                icon={<ArrowRight className="w-5 h-5" />}
                iconPosition="end"
              >
                Начать создание древа
              </Button>
            </Link>
            <Link href="#features">
              <Button
                size="large"
                className="h-14 px-8 text-lg font-semibold bg-charcoal-800/80 backdrop-blur-sm border-charcoal-700 text-white hover:bg-charcoal-700 hover:border-orange hover:scale-105 transition-all duration-300"
              >
                Узнать больше
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
