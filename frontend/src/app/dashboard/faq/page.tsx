'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Spin, Collapse, Input } from 'antd'
import {
  TreePine,
  ArrowLeft,
  HelpCircle,
  Search,
  MessageCircle,
  Shield,
  Smartphone,
  Database,
  Share2,
  CreditCard,
  Sparkles,
} from 'lucide-react'
import { authApi } from '@/lib/api/auth'
import { User as UserType, ApiError } from '@/types'
import { isAuthenticated, getErrorMessage } from '@/lib/utils'
import { message } from 'antd'

interface FAQItem {
  key: string
  category: string
  question: string
  answer: string
}

export default function FAQPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth')
      return
    }

    const fetchData = async () => {
      try {
        const userData = await authApi.me()
        setUser(userData)
      } catch (error) {
        const apiError = error as ApiError
        const errorMessage = getErrorMessage(apiError)
        message.error(errorMessage)
        if (apiError.status === 401) {
          router.push('/auth')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const categories = [
    { id: 'general', name: 'Общие вопросы', icon: HelpCircle },
    { id: 'telegram', name: 'Telegram бот', icon: MessageCircle },
    { id: 'privacy', name: 'Безопасность', icon: Shield },
    { id: 'mobile', name: 'Мобильная версия', icon: Smartphone },
    { id: 'data', name: 'Данные', icon: Database },
    { id: 'sharing', name: 'Совместный доступ', icon: Share2 },
    { id: 'premium', name: 'Премиум функции', icon: CreditCard },
    { id: 'ai', name: 'AI функции', icon: Sparkles },
  ]

  const faqItems: FAQItem[] = [
    // General
    {
      key: '1',
      category: 'general',
      question: 'Что такое GeneticTree?',
      answer: 'GeneticTree — это современная платформа для создания и управления семейным древом. Вы можете добавлять родственников, устанавливать связи между ними, хранить семейные истории и создавать красивые визуализации вашей родословной.',
    },
    {
      key: '2',
      category: 'general',
      question: 'Как начать пользоваться сервисом?',
      answer: 'Зарегистрируйтесь на сайте, создайте свой профиль и начните добавлять родственников. Вы можете добавлять информацию вручную или использовать Telegram бота для сбора данных от родственников.',
    },
    {
      key: '3',
      category: 'general',
      question: 'Сервис бесплатный?',
      answer: 'Базовые функции сервиса бесплатны. Вы можете создавать древо, добавлять родственников и истории без ограничений. Премиум функции, такие как генерация книги и AI-возможности, будут доступны по подписке.',
    },
    // Telegram
    {
      key: '4',
      category: 'telegram',
      question: 'Как работает Telegram бот?',
      answer: 'Telegram бот позволяет собирать семейные истории от ваших родственников. Вы создаёте уникальную ссылку для каждого родственника, они переходят по ней и отвечают на вопросы бота. Истории автоматически добавляются в их профиль.',
    },
    {
      key: '5',
      category: 'telegram',
      question: 'Как отправить ссылку родственнику?',
      answer: 'В карточке родственника нажмите кнопку "Создать ссылку для сбора историй". Скопируйте сгенерированную ссылку и отправьте её родственнику через любой мессенджер.',
    },
    {
      key: '6',
      category: 'telegram',
      question: 'Могу ли я изменить вопросы бота?',
      answer: 'В текущей версии набор вопросов стандартный и оптимизирован для сбора семейных историй. В будущих обновлениях планируется возможность настройки вопросов.',
    },
    // Privacy
    {
      key: '7',
      category: 'privacy',
      question: 'Кто может видеть моё семейное древо?',
      answer: 'По умолчанию ваше древо приватно и доступно только вам. Вы можете настроить совместный доступ для конкретных людей или сделать древо публичным.',
    },
    {
      key: '8',
      category: 'privacy',
      question: 'Как защищены мои данные?',
      answer: 'Мы используем современные методы шифрования для защиты ваших данных. Вся информация хранится на защищённых серверах с регулярным резервным копированием.',
    },
    {
      key: '9',
      category: 'privacy',
      question: 'Могу ли я удалить свои данные?',
      answer: 'Да, вы можете в любой момент удалить свой аккаунт и все связанные данные. Для этого обратитесь в службу поддержки или используйте соответствующую функцию в настройках.',
    },
    // Mobile
    {
      key: '10',
      category: 'mobile',
      question: 'Есть ли мобильное приложение?',
      answer: 'В настоящее время GeneticTree доступен как веб-приложение, оптимизированное для мобильных устройств. Нативные приложения для iOS и Android находятся в разработке.',
    },
    {
      key: '11',
      category: 'mobile',
      question: 'Корректно ли отображается сайт на телефоне?',
      answer: 'Да, сайт полностью адаптивен и оптимизирован для использования на смартфонах и планшетах. Все функции доступны с мобильных устройств.',
    },
    // Data
    {
      key: '12',
      category: 'data',
      question: 'Можно ли импортировать данные из других сервисов?',
      answer: 'В текущей версии импорт из других сервисов не поддерживается. Эта функция планируется в будущих обновлениях.',
    },
    {
      key: '13',
      category: 'data',
      question: 'Можно ли экспортировать моё древо?',
      answer: 'Да, вы можете экспортировать древо в формате GEDCOM (стандарт для генеалогических данных), а также в PDF с визуализацией.',
    },
    {
      key: '14',
      category: 'data',
      question: 'Есть ли ограничение на количество родственников?',
      answer: 'В бесплатной версии нет ограничений на количество добавляемых родственников. Вы можете создать древо любого размера.',
    },
    // Sharing
    {
      key: '15',
      category: 'sharing',
      question: 'Как пригласить родственника для совместного редактирования?',
      answer: 'Перейдите в настройки древа, выберите "Совместный доступ" и отправьте приглашение по email. Приглашённый сможет просматривать и редактировать древо после регистрации.',
    },
    {
      key: '16',
      category: 'sharing',
      question: 'Можно ли ограничить права доступа?',
      answer: 'Да, вы можете выбрать уровень доступа для каждого приглашённого: только просмотр, редактирование определённых веток или полный доступ.',
    },
    // Premium
    {
      key: '17',
      category: 'premium',
      question: 'Какие премиум функции планируются?',
      answer: 'Премиум функции включают: генерация семейной книги в PDF, AI-помощник для создания древа, расширенная аналитика, приоритетная поддержка и отсутствие рекламы.',
    },
    {
      key: '18',
      category: 'premium',
      question: 'Когда будет доступна премиум подписка?',
      answer: 'Премиум функции находятся в разработке. Следите за обновлениями в нашем блоге и социальных сетях.',
    },
    // AI
    {
      key: '19',
      category: 'ai',
      question: 'Как работает AI-генерация древа?',
      answer: 'AI-помощник анализирует ваш текстовый запрос и автоматически создаёт структуру древа с родственниками и связями. Вы можете описать семью словами, и AI создаст визуальное древо.',
    },
    {
      key: '20',
      category: 'ai',
      question: 'Можно ли редактировать древо через AI?',
      answer: 'Да, вы можете давать текстовые команды для изменения древа, например: "Добавь брата Ивану" или "Измени дату рождения бабушки на 1950 год".',
    },
    {
      key: '21',
      category: 'ai',
      question: 'Как генерируется семейная книга?',
      answer: 'AI анализирует данные о ваших родственниках, их истории и связи, затем создаёт связное повествование о вашей семье с иллюстрациями и генеалогическими схемами.',
    },
  ]

  const filteredFAQ = faqItems.filter((item) => {
    const matchesSearch =
      searchTerm === '' ||
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory =
      activeCategory === null || item.category === activeCategory

    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal-950">
        <Spin size="large" />
      </div>
    )
  }

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

          <Button
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => router.push('/dashboard')}
            className="bg-charcoal-800 border-charcoal-700 hover:border-orange"
          >
            Назад
          </Button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-charcoal-800 border border-charcoal-700 mb-4">
            <HelpCircle className="w-4 h-4 text-orange" />
            <span className="text-sm text-gray-300 font-medium">
              Помощь
            </span>
          </div>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">
            Часто задаваемые <span className="gradient-text">вопросы</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl">
            Найдите ответы на популярные вопросы о работе с GeneticTree
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <Input
            placeholder="Поиск по вопросам..."
            prefix={<Search className="w-4 h-4 text-gray-500" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md bg-charcoal-800 border-charcoal-700"
            size="large"
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button
            onClick={() => setActiveCategory(null)}
            className={`${
              activeCategory === null
                ? 'bg-orange border-orange text-white'
                : 'bg-charcoal-800 border-charcoal-700'
            }`}
          >
            Все
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              icon={<category.icon className="w-4 h-4" />}
              className={`${
                activeCategory === category.id
                  ? 'bg-orange border-orange text-white'
                  : 'bg-charcoal-800 border-charcoal-700'
              }`}
            >
              {category.name}
            </Button>
          ))}
        </div>

        {/* FAQ Count */}
        <div className="mb-6 text-gray-400">
          Найдено вопросов: <span className="text-orange font-bold">{filteredFAQ.length}</span>
        </div>

        {/* FAQ List */}
        <Collapse
          items={filteredFAQ.map((item) => ({
            key: item.key,
            label: (
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-orange flex-shrink-0" />
                <span className="font-medium text-white">{item.question}</span>
              </div>
            ),
            children: <p className="text-gray-300 pl-8">{item.answer}</p>,
          }))}
          className="bg-charcoal-900 border border-charcoal-700 rounded-2xl"
          expandIconPosition="end"
        />

        {/* Contact Support */}
        <div className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-charcoal-900 to-charcoal-800 border border-charcoal-700">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-serif text-2xl font-bold mb-2 text-white">
                Не нашли ответ?
              </h3>
              <p className="text-gray-400">
                Свяжитесь с нашей службой поддержки — мы поможем решить любой вопрос
              </p>
            </div>
            <Button
              type="primary"
              size="large"
              icon={<MessageCircle className="w-5 h-5" />}
              className="shadow-glow-orange"
            >
              Написать в поддержку
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
