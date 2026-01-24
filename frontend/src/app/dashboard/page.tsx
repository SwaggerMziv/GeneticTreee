'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Spin, App } from 'antd'
import {
  TreePine,
  LogOut,
  User,
  Users,
  Link2,
  Layers,
  UserPlus,
  ArrowRight,
  TrendingUp,
  BookOpen,
  FileText,
  Sparkles,
  HelpCircle,
  BookMarked,
  UserCheck,
} from 'lucide-react'
import { authApi } from '@/lib/api/auth'
import { statisticsApi } from '@/lib/api/family'
import { User as UserType, ApiError, FamilyStatistics } from '@/types'
import { isAuthenticated, clearAuthTokens, getErrorMessage } from '@/lib/utils'
import ActivatedRelativesModal from '@/components/family/ActivatedRelativesModal'

export default function DashboardPage() {
  const router = useRouter()
  const { message } = App.useApp()
  const [user, setUser] = useState<UserType | null>(null)
  const [stats, setStats] = useState<FamilyStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activatedModalVisible, setActivatedModalVisible] = useState(false)

  const mounted = useRef(false)

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    // Attempt to fetch data even if localStorage is empty, to support cookie-based sessions
    const fetchData = async () => {
      try {
        const userData = await authApi.me()
        setUser(userData)

        // Fetch statistics
        try {
          const statsData = await statisticsApi.getStatistics(userData.id)
          setStats(statsData)
        } catch {
          // If no statistics yet, use defaults
          setStats({
            total_relatives: 0,
            total_relationships: 0,
            alive_relatives: 0,
            deceased_relatives: 0,
            activated_relatives: 0,
            gender_distribution: { male: 0, female: 0, other: 0 },
            relationship_types_count: 0,
            generations_count: 0,
            relationship_types: [],
            total_stories: 0,
          })
        }
      } catch (error) {
        const apiError = error as ApiError
        const errorMessage = getErrorMessage(apiError)
        if (apiError.status === 401) {
          router.push('/auth')
        } else {
          message.error(errorMessage)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleLogout = async () => {
    try {
      await authApi.logout()
      message.success('Вы успешно вышли из системы')
      router.push('/')
    } catch {
      clearAuthTokens()
      router.push('/')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal-950">
        <Spin size="large" />
      </div>
    )
  }

  const statCards = [
    {
      title: 'Родственников',
      value: stats?.total_relatives || 0,
      icon: Users,
      color: 'from-orange to-orange-dark',
      subtext: `${stats?.alive_relatives || 0} живых`,
      clickable: false,
    },
    {
      title: 'Подключено',
      value: stats?.activated_relatives || 0,
      icon: UserCheck,
      color: 'from-emerald-500 to-emerald-600',
      subtext: 'к Telegram боту',
      clickable: true,
      onClick: () => setActivatedModalVisible(true),
    },
    {
      title: 'Связей',
      value: stats?.total_relationships || 0,
      icon: Link2,
      color: 'from-blue-500 to-blue-600',
      subtext: `${stats?.relationship_types_count || 0} типов`,
      clickable: false,
    },
    {
      title: 'Историй',
      value: stats?.total_stories || 0,
      icon: BookOpen,
      color: 'from-green-500 to-green-600',
      subtext: 'семейных историй',
      clickable: false,
    },
    {
      title: 'Поколений',
      value: stats?.generations_count || 0,
      icon: Layers,
      color: 'from-purple-500 to-purple-600',
      subtext: 'в вашем древе',
      clickable: false,
    },
  ]

  return (
    <div className="min-h-screen bg-charcoal-950">
      {/* Header */}
      <header className="border-b border-charcoal-700 bg-charcoal-900/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange to-orange-dark flex items-center justify-center transition-transform group-hover:scale-105">
              <TreePine className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-serif text-2xl font-bold">
              <span className="text-white">Genetic</span>
              <span className="gradient-text">Tree</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-charcoal-800 border border-charcoal-700">
              <User className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium">{user?.username}</span>
            </div>
            <Button
              icon={<LogOut className="w-4 h-4" />}
              onClick={handleLogout}
              className="bg-charcoal-800 border-charcoal-700 hover:border-orange"
            >
              Выйти
            </Button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-charcoal-800 border border-charcoal-700 mb-4">
            <TrendingUp className="w-4 h-4 text-orange" />
            <span className="text-sm text-gray-300 font-medium">
              Панель управления
            </span>
          </div>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">
            С возвращением, <span className="gradient-text">{user?.username}</span>!
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl">
            Управляйте своим семейным древом, добавляйте родственников и создавайте связи между ними.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          {statCards.map((card, index) => (
            <div
              key={index}
              onClick={card.clickable ? card.onClick : undefined}
              className={`group p-6 rounded-2xl bg-charcoal-900 border border-charcoal-700 hover:border-charcoal-600 transition-all duration-300 ${
                card.clickable ? 'cursor-pointer hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color}`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                {card.clickable && (
                  <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                )}
              </div>
              <div className="text-4xl font-bold font-serif mb-1 text-white">
                {card.value}
              </div>
              <div className="text-gray-300 font-medium mb-1">{card.title}</div>
              <div className="text-sm text-gray-500">{card.subtext}</div>
            </div>
          ))}
        </div>

        {/* Statistics Details */}
        {stats && stats.total_relatives > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
            {/* Gender Distribution */}
            <div className="p-6 rounded-2xl bg-charcoal-900 border border-charcoal-700">
              <h3 className="font-serif text-xl font-bold mb-6 text-white">Распределение по полу</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-gray-300">Мужчины</span>
                    <span className="ml-auto font-bold text-white">{stats.gender_distribution.male}</span>
                  </div>
                  <div className="h-2 bg-charcoal-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{
                        width: `${stats.total_relatives > 0
                          ? (stats.gender_distribution.male / stats.total_relatives) * 100
                          : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-3 rounded-full bg-pink-500" />
                    <span className="text-gray-300">Женщины</span>
                    <span className="ml-auto font-bold text-white">{stats.gender_distribution.female}</span>
                  </div>
                  <div className="h-2 bg-charcoal-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pink-500 rounded-full transition-all"
                      style={{
                        width: `${stats.total_relatives > 0
                          ? (stats.gender_distribution.female / stats.total_relatives) * 100
                          : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-3 rounded-full bg-gray-500" />
                    <span className="text-gray-300">Другие</span>
                    <span className="ml-auto font-bold text-white">{stats.gender_distribution.other}</span>
                  </div>
                  <div className="h-2 bg-charcoal-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-500 rounded-full transition-all"
                      style={{
                        width: `${stats.total_relatives > 0
                          ? (stats.gender_distribution.other / stats.total_relatives) * 100
                          : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Life Status */}
            <div className="p-6 rounded-2xl bg-charcoal-900 border border-charcoal-700">
              <h3 className="font-serif text-xl font-bold mb-6 text-white">Статус</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-gray-300">Живые</span>
                    <span className="ml-auto font-bold text-white">{stats.alive_relatives}</span>
                  </div>
                  <div className="h-2 bg-charcoal-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{
                        width: `${stats.total_relatives > 0
                          ? (stats.alive_relatives / stats.total_relatives) * 100
                          : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-3 rounded-full bg-gray-600" />
                    <span className="text-gray-300">Ушедшие</span>
                    <span className="ml-auto font-bold text-white">{stats.deceased_relatives}</span>
                  </div>
                  <div className="h-2 bg-charcoal-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-600 rounded-full transition-all"
                      style={{
                        width: `${stats.total_relatives > 0
                          ? (stats.deceased_relatives / stats.total_relatives) * 100
                          : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
                
                {/* Married Stats */}
                <div className="pt-4 mt-4 border-t border-charcoal-800">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-gray-300">В браке / отношениях</span>
                    <span className="ml-auto font-bold text-white">
                      {stats.relationship_types
                        .filter(r => ['husband', 'wife', 'partner', 'spouse'].includes(r.type))
                        .reduce((acc, curr) => acc + curr.count, 0)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Количество людей, состоящих в браке или партнерстве
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="mt-6 pt-4 border-t border-charcoal-700">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-orange">{stats.generations_count}</div>
                    <div className="text-xs text-gray-500">Поколений</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange">{stats.relationship_types_count}</div>
                    <div className="text-xs text-gray-500">Типов связей</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Assistant - Primary Action */}
        <div className="mb-8">
          <h2 className="font-serif text-2xl font-bold mb-6 text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange" />
            AI Ассистент
          </h2>
          <Link
            href="/dashboard/ai-assistant"
            className="group block p-6 rounded-2xl bg-gradient-to-br from-charcoal-900 to-charcoal-800 border-2 border-orange/30 hover:border-orange transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-orange to-orange-dark">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <ArrowRight className="w-6 h-6 text-gray-500 group-hover:text-orange group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-serif text-2xl font-bold mb-2 text-white">AI Помощник</h3>
            <p className="text-gray-400">
              Создавайте и редактируйте семейное древо с помощью искусственного интеллекта.
              Опишите вашу семью текстом - AI автоматически создаст структуру дерева.
            </p>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="font-serif text-2xl font-bold mb-6 text-white">Быстрые действия</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Family Tree */}
            <Link
              href="/tree"
              className="group p-6 rounded-2xl bg-gradient-to-br from-charcoal-900 to-charcoal-800 border border-charcoal-700 hover:border-orange/50 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange to-orange-dark">
                  <TreePine className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-orange group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-2 text-white">Семейное древо</h3>
              <p className="text-gray-400 text-sm">
                Визуализируйте и управляйте вашим семейным древом
              </p>
            </Link>

            {/* Family Stories */}
            <Link
              href="/dashboard/stories"
              className="group p-6 rounded-2xl bg-gradient-to-br from-charcoal-900 to-charcoal-800 border border-charcoal-700 hover:border-orange/50 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-orange group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-2 text-white">Семейная лента</h3>
              <p className="text-gray-400 text-sm">
                Истории и воспоминания ваших родственников
              </p>
            </Link>

            {/* Add Relative */}
            <Link
              href="/tree"
              className="group p-6 rounded-2xl bg-gradient-to-br from-charcoal-900 to-charcoal-800 border border-charcoal-700 hover:border-orange/50 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-orange group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-2 text-white">Добавить родственника</h3>
              <p className="text-gray-400 text-sm">
                Начните создавать ваше семейное древо
              </p>
            </Link>
          </div>
        </div>

        {/* Book Generator */}
        <div className="mb-8">
          <h2 className="font-serif text-2xl font-bold mb-6 text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange" />
            Создание книги семьи
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Book Generator */}
            <Link
              href="/dashboard/book"
              className="group p-6 rounded-2xl bg-gradient-to-br from-charcoal-900 to-charcoal-800 border border-charcoal-700 hover:border-orange/50 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-orange group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-2 text-white">Генерация книги</h3>
              <p className="text-gray-400 text-sm">
                Создайте PDF книгу о вашей семье с историями и иллюстрациями
              </p>
            </Link>
          </div>
        </div>

        {/* Help & Resources */}
        <div className="mb-8">
          <h2 className="font-serif text-2xl font-bold mb-6 text-white">Помощь и ресурсы</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Guide */}
            <Link
              href="/dashboard/guide"
              className="group p-6 rounded-2xl bg-gradient-to-br from-charcoal-900 to-charcoal-800 border border-charcoal-700 hover:border-orange/50 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600">
                  <BookMarked className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-orange group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-2 text-white">Руководство</h3>
              <p className="text-gray-400 text-sm">
                Пошаговая инструкция по созданию семейного древа
              </p>
            </Link>

            {/* FAQ */}
            <Link
              href="/dashboard/faq"
              className="group p-6 rounded-2xl bg-gradient-to-br from-charcoal-900 to-charcoal-800 border border-charcoal-700 hover:border-orange/50 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600">
                  <HelpCircle className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-orange group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-2 text-white">FAQ</h3>
              <p className="text-gray-400 text-sm">
                Ответы на часто задаваемые вопросы
              </p>
            </Link>
          </div>
        </div>
      </main>

      {/* Activated Relatives Modal */}
      {user && (
        <ActivatedRelativesModal
          visible={activatedModalVisible}
          onClose={() => setActivatedModalVisible(false)}
          userId={user.id}
          activatedCount={stats?.activated_relatives || 0}
        />
      )}
    </div>
  )
}
