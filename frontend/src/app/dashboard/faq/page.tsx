'use client'

import { useState } from 'react'
import {
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
import { useUser } from '@/components/providers/UserProvider'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

interface FAQItem {
  key: string
  category: string
  question: string
  answer: string
}

export default function FAQPage() {
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

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

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
      {/* Page Header */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border mb-4">
          <HelpCircle className="w-4 h-4 text-orange" />
          <span className="text-sm text-muted-foreground font-medium">
            Помощь
          </span>
        </div>
        <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">
          Часто задаваемые <span className="gradient-text">вопросы</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Найдите ответы на популярные вопросы о работе с GeneticTree
        </p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по вопросам..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 bg-muted border-border"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button
          onClick={() => setActiveCategory(null)}
          variant={activeCategory === null ? 'default' : 'outline'}
          className={
            activeCategory === null
              ? 'bg-orange hover:bg-orange/90 border-orange text-white'
              : 'bg-charcoal-800 border-border hover:bg-charcoal-700'
          }
        >
          Все
        </Button>
        {categories.map((category) => {
          const Icon = category.icon
          return (
            <Button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              variant={activeCategory === category.id ? 'default' : 'outline'}
              className={
                activeCategory === category.id
                  ? 'bg-orange hover:bg-orange/90 border-orange text-white'
                  : 'bg-charcoal-800 border-border hover:bg-charcoal-700'
              }
            >
              <Icon className="w-4 h-4" />
              {category.name}
            </Button>
          )
        })}
      </div>

      {/* FAQ Count */}
      <div className="mb-6 text-muted-foreground">
        Найдено вопросов: <span className="text-orange font-bold">{filteredFAQ.length}</span>
      </div>

      {/* FAQ List */}
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <Accordion type="multiple">
            {filteredFAQ.map((item, index) => (
              <AccordionItem
                key={item.key}
                value={item.key}
                className={index === filteredFAQ.length - 1 ? 'border-b-0' : ''}
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-orange flex-shrink-0" />
                    <span className="font-medium text-foreground">{item.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground pl-8">{item.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card className="mt-12 border-border bg-gradient-to-br from-charcoal-900 to-charcoal-800">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-serif text-2xl font-bold mb-2 text-foreground">
                Не нашли ответ?
              </h3>
              <p className="text-muted-foreground">
                Свяжитесь с нашей службой поддержки — мы поможем решить любой вопрос
              </p>
            </div>
            <Button
              size="lg"
              className="shadow-glow-orange"
            >
              <MessageCircle className="w-5 h-5" />
              Написать в поддержку
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
