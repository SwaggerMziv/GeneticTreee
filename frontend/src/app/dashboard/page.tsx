'use client'

import Link from 'next/link'
import {
  TreePine,
  Sparkles,
  BookOpen,
  FileText,
  Send,
  ArrowRight,
  Users,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useUser } from '@/components/providers/UserProvider'

export default function DashboardPage() {
  const { user, stats } = useUser()

  const quickActions = [
    {
      href: '/tree',
      icon: TreePine,
      title: 'Семейное древо',
      description: 'Визуальное дерево с родственниками и связями между ними',
      color: 'from-[#7BAEC8] to-[#6A9DC4]',
    },
    {
      href: '/dashboard/ai-assistant',
      icon: Sparkles,
      title: 'ИИ Ассистент',
      description: 'Добавляйте родственников и связи текстовыми командами',
      color: 'from-[#A893C4] to-[#9680B8]',
    },
    {
      href: '/dashboard/telegram',
      icon: Send,
      title: 'Telegram',
      description: 'Пригласите родственников — бот проведёт интервью и соберёт истории',
      color: 'from-[#6BA5CA] to-[#5A94BE]',
    },
    {
      href: '/dashboard/stories',
      icon: BookOpen,
      title: 'Истории',
      description: 'Семейные воспоминания и рассказы от родственников',
      color: 'from-[#7EBB9E] to-[#6DAE8E]',
      stat: stats && stats.total_stories > 0
        ? `${stats.total_stories} ${stats.total_stories === 1 ? 'история' : stats.total_stories < 5 ? 'истории' : 'историй'}`
        : null,
    },
    {
      href: '/dashboard/book',
      icon: FileText,
      title: 'Книга',
      description: 'Сгенерируйте PDF-книгу из собранных историй вашей семьи',
      color: 'from-[#C48A9E] to-[#B87A90]',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      {/* Welcome */}
      <div className="mb-10">
        <h1 className="font-serif text-3xl lg:text-4xl font-bold mb-2">
          С возвращением, <span className="gradient-text">{user?.username}</span>!
        </h1>
        <p className="text-muted-foreground">
          Что хотите сделать сегодня?
        </p>
      </div>

      {/* Quick Actions — main navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="group cursor-pointer shadow-pastel hover:border-azure/50 hover:shadow-candy transition-all duration-300 h-full">
              <CardContent className="p-6 flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold">{action.title}</h3>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                  {action.stat && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7EBB9E]/10 text-[#5DA882] dark:text-[#7EBB9E]">
                      <BookOpen className="w-3 h-3" />
                      <span className="text-xs font-semibold">{action.stat}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Statistics — only when there's data */}
      {stats && stats.total_relatives > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Family Overview */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-serif text-lg font-bold mb-5">Обзор семьи</h3>

              {/* Gender bars */}
              <div className="space-y-3 mb-5">
                {[
                  { label: 'Мужчины', value: stats.gender_distribution.male, color: 'bg-[#7BAEC8]' },
                  { label: 'Женщины', value: stats.gender_distribution.female, color: 'bg-[#D4607E]' },
                  ...(stats.gender_distribution.other > 0
                    ? [{ label: 'Другие', value: stats.gender_distribution.other, color: 'bg-[#B0A898]' }]
                    : []),
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center gap-3 mb-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className="ml-auto text-sm font-bold">{item.value}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-500`}
                        style={{
                          width: `${(item.value / stats.total_relatives) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary counters */}
              <div className="pt-4 border-t">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-9 h-9 rounded-lg bg-azure/10 flex items-center justify-center">
                      <Users className="w-4.5 h-4.5 text-azure" />
                    </div>
                    <div>
                      <div className="text-lg font-bold">{stats.total_relatives}</div>
                      <div className="text-xs text-muted-foreground">Всего в древе</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-9 h-9 rounded-lg bg-[#6BA5CA]/10 flex items-center justify-center">
                      <Send className="w-4 h-4 text-[#6BA5CA]" />
                    </div>
                    <div>
                      <div className="text-lg font-bold">{stats.activated_relatives}</div>
                      <div className="text-xs text-muted-foreground">В Telegram</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Life Status */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-serif text-lg font-bold mb-5">Статус</h3>
              <div className="space-y-3">
                {[
                  { label: 'Живые', value: stats.alive_relatives, color: 'bg-[#7EBB9E]' },
                  { label: 'Ушедшие', value: stats.deceased_relatives, color: 'bg-[#9A9098]' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center gap-3 mb-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className="ml-auto text-sm font-bold">{item.value}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-500`}
                        style={{
                          width: `${(item.value / stats.total_relatives) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Generations & Types */}
              <div className="mt-5 pt-4 border-t">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-xl font-bold text-azure">{stats.generations_count}</div>
                    <div className="text-xs text-muted-foreground">Поколений</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-azure">{stats.relationship_types_count}</div>
                    <div className="text-xs text-muted-foreground">Типов связей</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-azure">
                      {stats.relationship_types
                        .filter(r => ['husband', 'wife', 'partner', 'spouse'].includes(r.type))
                        .reduce((acc, curr) => acc + curr.count, 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">В браке</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {stats && stats.total_relatives === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-azure to-azure-dark flex items-center justify-center mb-6">
              <TreePine className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-serif text-2xl font-bold mb-3">Создайте свою семейную книгу</h3>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Всего 4 шага до вашей семейной книги с историями и воспоминаниями.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto mb-8">
              {[
                { step: '1', title: 'Создайте древо', desc: 'Добавьте родственников', icon: TreePine },
                { step: '2', title: 'Пригласите', desc: 'Отправьте ссылки', icon: Send },
                { step: '3', title: 'Соберите истории', desc: 'Бот проведёт интервью', icon: BookOpen },
                { step: '4', title: 'Создайте книгу', desc: 'Получите PDF', icon: FileText },
              ].map((item) => (
                <div key={item.step} className="text-center p-4 rounded-xl bg-muted border border-border shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-azure text-white font-bold flex items-center justify-center mx-auto mb-3 text-sm">
                    {item.step}
                  </div>
                  <item.icon className="w-5 h-5 text-azure mx-auto mb-2" />
                  <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
            <Link href="/tree">
              <Button className="bg-gradient-to-r from-azure to-azure-dark text-white h-12 px-8">
                <TreePine className="w-5 h-5 mr-2" />
                Начать строить древо
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
