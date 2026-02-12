'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  BookOpen,
  TreePine,
  Send,
  FileText,
  Sparkles,
  Camera,
  Users,
  Clock,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuthLink } from '@/hooks/use-auth-link'

function BookPreview() {
  return (
    <div className="relative">
      {/* Book mock */}
      <div className="relative bg-card rounded-2xl border border-border shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-transform duration-500">
        {/* Book cover / title page */}
        <div className="bg-gradient-to-br from-azure/10 to-azure-dark/10 rounded-xl p-5 border border-azure/20">
          <div className="text-center space-y-2 mb-5">
            <TreePine className="w-8 h-8 text-azure mx-auto" />
            <h3 className="font-serif text-lg font-bold">Семейная Книга</h3>
            <div className="w-12 h-0.5 bg-azure mx-auto" />
            <p className="text-xs text-muted-foreground">История нашего рода</p>
          </div>

          {/* Table of contents preview */}
          <div className="bg-background/60 rounded-lg p-3 border border-border/50 space-y-2 mb-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Содержание</p>
            {[
              { icon: BookOpen, label: 'Введение', page: '3' },
              { icon: Users, label: 'Семейное древо', page: '4' },
              { icon: Clock, label: 'Хронология событий', page: '6' },
              { icon: FileText, label: 'Глава 1. Детские воспоминания', page: '8' },
              { icon: FileText, label: 'Глава 2. История семьи', page: '12' },
              { icon: FileText, label: 'Заключение', page: '16' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <item.icon className="w-3 h-3 text-azure/60 shrink-0" />
                <span className="text-muted-foreground truncate flex-1">{item.label}</span>
                <span className="text-muted-foreground/50 font-mono">{item.page}</span>
              </div>
            ))}
          </div>

          {/* Family tree section preview */}
          <div className="bg-background/60 rounded-lg p-3 border border-border/50 mb-3">
            <p className="text-[10px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Users className="w-3 h-3 text-azure/60" />
              Семейное древо
            </p>
            <div className="flex gap-1.5 justify-center">
              {[
                { name: 'Мария П.', color: 'border-pink-400 bg-pink-50 dark:bg-pink-950/30' },
                { name: 'Иван П.', color: 'border-blue-400 bg-blue-50 dark:bg-blue-950/30' },
                { name: 'Елена П.', color: 'border-pink-400 bg-pink-50 dark:bg-pink-950/30' },
              ].map((card, i) => (
                <div key={i} className={`flex items-center gap-1 px-1.5 py-1 rounded border text-[8px] ${card.color}`}>
                  <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                    <Camera className="w-2.5 h-2.5 text-muted-foreground" />
                  </div>
                  <span className="font-medium text-foreground">{card.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chapter with photo preview */}
          <div className="bg-background/60 rounded-lg p-3 border border-border/50">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <FileText className="w-3 h-3 text-azure/60" />
              Глава 1. Детские воспоминания
            </p>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <div className="h-1.5 bg-muted rounded-full w-full" />
                <div className="h-1.5 bg-muted rounded-full w-4/5" />
                <div className="h-1.5 bg-muted rounded-full w-full" />
                <div className="h-1.5 bg-muted rounded-full w-3/5" />
              </div>
              <div className="w-14 h-12 rounded border border-border bg-gradient-to-br from-azure/10 to-azure-dark/10 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4 text-azure/30" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute -top-4 -left-4 bg-card rounded-xl border border-border shadow-lg p-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-purple-500" />
        </div>
        <div>
          <p className="text-xs font-semibold">ИИ-ассистент</p>
          <p className="text-[10px] text-muted-foreground">Строит древо</p>
        </div>
      </div>

      <div className="absolute -bottom-4 -right-4 bg-card rounded-xl border border-border shadow-lg p-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <Send className="w-4 h-4 text-blue-500" />
        </div>
        <div>
          <p className="text-xs font-semibold">Telegram бот</p>
          <p className="text-[10px] text-muted-foreground">Собирает истории</p>
        </div>
      </div>
    </div>
  )
}

export default function Hero() {
  const authLink = useAuthLink()

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Subtle background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-azure/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-azure-dark/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text Content */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/80 backdrop-blur-sm border border-border mb-8"
            >
              <BookOpen className="w-4 h-4 text-azure" />
              <span className="text-sm text-muted-foreground font-medium">
                Древо, истории и книга в одном месте
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-8"
            >
              Создание{' '}
              <span className="gradient-text">семейной книги</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-muted-foreground leading-relaxed mb-10 max-w-xl"
            >
              Постройте семейное древо вручную или с ИИ-ассистентом.
              Telegram-бот проведёт интервью и соберёт истории с фото.
              Всё превратится в красивую PDF-книгу с главами, хронологией и фотографиями.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Link href={authLink}>
                <Button
                  className="h-14 px-8 text-lg font-semibold bg-gradient-to-r from-azure to-azure-dark text-white hover:shadow-glow-azure hover:scale-105 transition-all duration-300"
                >
                  Начать бесплатно
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Right: Book Contents Preview */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="hidden lg:block"
          >
            <BookPreview />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
