'use client'

// ==================== ИМПОРТЫ ====================
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Spin, Input, App, Switch, Tooltip } from 'antd'
import {
  TreePine,
  ArrowLeft,
  Sparkles,
  Send,
  Bot,
  RefreshCw,
  AlertTriangle,
  XCircle,
  User,
  UserPlus,
  Trash2,
  Edit,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Link as LinkIcon,
  Brain,
  CheckCircle2,
  Clock, // Added Clock
  Hourglass // Added Hourglass
} from 'lucide-react'
import { familyApi, relationshipApi } from '@/lib/api/family'
import { authApi } from '@/lib/api/auth'
import {
  User as UserType,
  ApiError,
} from '@/types'
import { isAuthenticated, getErrorMessage } from '@/lib/utils'
import {
  streamUnified,
  AIStreamChunk,
  ChatMessage,
} from '@/lib/api/ai'

const { TextArea } = Input

// ==================== ТИПЫ ====================
interface DisplayMessage {
  id: string
  type: 'user' | 'assistant' | 'thinking' | 'warning' | 'error'
  content: string
  actions?: ActionData[]  // Действия прикреплены к сообщению
  timestamp: Date
}

interface ActionData {
  action_type: string
  data: any
  result?: {
    success: boolean
    id?: number
    name?: string
    error?: string
    deleted_key?: string
    count?: number
    data?: any
  }
  __meta?: {
    state?: 'pending' | 'accepted' | 'declined' | 'reverted'
    autoAccepted?: boolean
  }
}

const quickStartPrompts = [
  'Добавь нового родственника: Алексей Иванов, мужской, поколение 3, 1980 г.',
  'Создай связь отец-сын между ID 3 и 7',
  'Добавь мать Анне Петровой: Мария Петрова, поколение 2',
  'Создай супружескую связь между ID 10 и 11',
  'Добавь историю о дедушке: как он переехал в другой город',
  'Проверь, есть ли дубликаты по имени и дате рождения',
  'Добавь брата Сергею: Иван Сергеев, поколение 3',
  'Создай связь мать-дочь между ID 4 и 12',
  'Добавь родителя: Виктор Павлов, 1955 г., поколение 1',
  'Добавь родственника: Ольга Смирнова, женский, 1992 г.',
  'Создай связь супруги между ID 8 и 15',
  'Добавь сына Ивану: Пётр Иванов, 2010 г.',
  'Добавь бабушку по отцовской линии, поколение 1',
  'Создай историю: как семья переехала в 1990-х',
  'Добавь умершего родственника: Николай, 1930-2001',
  'Создай связь братьев между ID 14 и 17',
  'Добавь тётю: Елена Ковалева, поколение 2',
  'Создай связь опекун-ребёнок для ID 5 и 18',
  'Добавь профессию деду: инженер-строитель',
  'Добавь место рождения Марии: Санкт-Петербург',
  'Создай связь дед-внук между ID 2 и 20',
  'Добавь прадеда: Степан, 1900-1980, поколение 0',
  'Создай связь сестёр между ID 6 и 9',
  'Добавь историю любви родителей',
  'Добавь родственника: Артём Кузнецов, мужской, 2005 г.',
  'Создай связь крестного для ID 22 и 7',
  'Добавь смену фамилии у Анны в 2015',
  'Создай связь отчим-ребёнок между ID 13 и 23',
  'Добавь родственника: Даша, женский, 2018 г.',
  'Создай связь племянник для ID 16 и 24',
  'Добавь медаль прадеду за службу',
  'Создай связь бабушка-внук между ID 12 и 25',
  'Добавь отчество Павлович для Дмитрия',
  'Создай связь приёмный родитель для ID 19 и 26',
  'Добавь фотоописание для Ирины',
  'Создай связь куратор-ребёнок для ID 27 и 5',
  'Добавь религиозную принадлежность прадеду',
  'Создай связь сосед по дому (контекст) для ID 28 и 4',
  'Добавь диплом о высшем образовании Марии',
  'Создай связь свёкор-невестка между ID 29 и 8',
  'Добавь близнеца Олегу: Оксана, 1990 г.',
  'Создай связь крестница для ID 30 и 7',
  'Добавь заметку: семейный бизнес открыт в 2005',
  'Создай связь мачеха-ребёнок между ID 31 и 9',
  'Добавь родственника: Тимур Алиев, мужской, 1988 г.',
  'Создай связь дядя-племянник для ID 5 и 32',
  'Добавь запись о переезде семьи в 1978',
  'Создай связь наставник для ID 6 и 33',
  'Добавь тэг «ветеран» прадеду',
  'Создай связь партнёрство гражданское для ID 34 и 10',
]

const advicePrompts = [
  'Как лучше оформить поколение для дальних родственников?',
  'Как искать записи в архиве по прадеду 1900 г.р.?',
  'Как проверить возможный дубликат по имени и году?',
  'Какие источники использовать для истории семьи XIX века?',
  'Как визуально отделить ветви по родителям?',
  'Как восстановить связи, если известны только имена родителей?',
  'Как отмечать неродственные связи (наставник/опекун)?',
  'Как хранить разные фамилии в одной ветви?',
  'Что добавить в контекст, чтобы различать тезок?',
  'Как фиксировать миграции по годам?',
  'Как вести учёт наград и военной службы?',
  'Как обозначить неполные даты рождения?',
  'Как связать усыновление и биологических родителей?',
  'Как правильно ставить поколение при нескольких браках?',
  'Как документировать устные истории бабушки?',
  'Как добавлять места (города) чтобы было наглядно?',
  'Какие теги использовать для поиска по профессии?',
  'Как отмечать непроверенные данные?',
  'Как попросить ИИ проверить консистентность дерева?',
  'Как проставить пол, если модель не уверена?',
  'Как добавить исторический контекст для периода 1941-1945?',
  'Как найти метрики: сколько мужчин/женщин в ветви?',
  'Как визуально выделить умерших родственников?',
  'Как хранить свидетельства (сканы) и привязывать ссылки?',
  'Как помечать переезд семьи в другой город?',
  'Как фиксировать разводы и повторные браки?',
  'Как добавить отчество, если его нет в записи?',
  'Как помечать обрыв ветви (нет данных)?',
  'Как запросить списком все связи выбранного пользователя?',
  'Как подсветить связи, которые нужно подтвердить?',
  'Как формировать биографию на основе контекста?',
  'Как проверять возрастные несостыковки?',
  'Как помечать предполагаемые даты рождения/смерти?',
  'Как вести связи с крестными/крестниками?',
  'Как отмечать однофамильцев без доказанной связи?',
  'Как разделять близнецов и двойняшек?',
  'Как проставить роли в семейном бизнесе?',
  'Как маркировать ветку «по матери» и «по отцу»?',
  'Как запросить список всех дедушек и бабушек?',
  'Как автоматом найти «дырки» в поколениях?',
  'Как настроить подсказки для расширения ветви?',
  'Как оформить timeline событий для одного родственника?',
  'Как добавить краткую справку к каждому поколению?',
  'Как искать эмигрантов по зарубежным базам?',
  'Как хранить языковые варианты имён?',
  'Как использовать истории для поисковых подсказок?',
  'Как выделять «ключевых» родственников в визуализации?',
  'Как контролировать дубликаты при массовом импорте?',
  'Как отмечать неполные связи (только мать известна)?',
  'Как собирать статистику по датам рождения?',
  'Как проверять корректность возраста родителей и детей?',
]

const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]

// ==================== КОМПОНЕНТ: КАРТОЧКА ДЕЙСТВИЯ ====================
const ActionCard = ({
  action,
  onRevert,
  onAccept,
  onDecline,
  autoAcceptEnabled,
}: {
  action: ActionData
  onRevert?: () => Promise<void> | void
  onAccept?: () => Promise<void> | void
  onDecline?: () => Promise<void> | void
  autoAcceptEnabled?: boolean
}) => {
  const { message } = App.useApp()
  const [expanded, setExpanded] = useState(false)
  const [reverting, setReverting] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)

  const state = action.__meta?.state || 'accepted'
  const pending = state === 'pending'
  const reverted = state === 'reverted'
  const declined = state === 'declined'
  const autoAccepted = !!action.__meta?.autoAccepted
  const supportRevert = ['create_relative', 'create_relationship']
  const controlsEnabled = !!onAccept || !!onDecline || !!onRevert

  const handleRevert = async () => {
    if (reverted || reverting) return
    setReverting(true)
    try {
      if (onRevert) {
        await onRevert()
      }
      message.success('Действие отменено')
    } catch (e) {
      message.error('Не удалось отменить действие')
    } finally {
      setReverting(false)
    }
  }

  const handleAccept = async () => {
    if (!onAccept || accepting || declining) return
    setAccepting(true)
    try {
      await onAccept()
      message.success('Действие принято')
    } catch (e) {
      message.error('Не удалось применить действие')
    } finally {
      setAccepting(false)
    }
  }

  const handleDecline = async () => {
    if (!onDecline || declining || accepting) return
    setDeclining(true)
    try {
      await onDecline()
      message.info('Действие отклонено')
    } catch (e) {
      message.error('Не удалось отклонить действие')
    } finally {
      setDeclining(false)
    }
  }

  // Конфигурация отображения по типу действия
  const getActionConfig = () => {
    if (reverted) {
      return {
        icon: <RotateCcw className="w-4 h-4 text-gray-500" />,
        title: 'Отменено',
        color: 'border-gray-700 bg-gray-800/30 opacity-60',
        details: 'Действие было отменено'
      }
    }

    const { action_type, data, result } = action
    const isSuccess = result?.success !== false

    switch (action_type) {
      case 'create_relative':
        return {
          icon: <UserPlus className="w-4 h-4 text-emerald-400" />,
          title: 'Родственник создан',
          color: isSuccess ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10',
          details: result?.name || `${data?.first_name || ''} ${data?.last_name || ''}`.trim()
        }
      case 'create_relationship':
        return {
          icon: <LinkIcon className="w-4 h-4 text-blue-400" />,
          title: 'Связь создана',
          color: isSuccess ? 'border-blue-500/30 bg-blue-500/10' : 'border-red-500/30 bg-red-500/10',
          details: data?.relationship_type || 'Связь'
        }
      case 'update_relative':
        return {
          icon: <Edit className="w-4 h-4 text-amber-400" />,
          title: 'Данные обновлены',
          color: isSuccess ? 'border-amber-500/30 bg-amber-500/10' : 'border-red-500/30 bg-red-500/10',
          details: `ID: ${data?.relative_id}`
        }
      case 'add_story':
        return {
          icon: <BookOpen className="w-4 h-4 text-purple-400" />,
          title: 'История добавлена',
          color: isSuccess ? 'border-purple-500/30 bg-purple-500/10' : 'border-red-500/30 bg-red-500/10',
          details: data?.key || 'История'
        }
      case 'delete_relationship':
        return {
          icon: <Trash2 className="w-4 h-4 text-red-400" />,
          title: 'Связь удалена',
          color: isSuccess ? 'border-red-500/30 bg-red-500/10' : 'border-red-500/30 bg-red-500/10',
          details: 'Связь между родственниками'
        }
      case 'delete_relative':
        return {
          icon: <Trash2 className="w-4 h-4 text-red-400" />,
          title: 'Родственник удалён',
          color: isSuccess ? 'border-red-500/30 bg-red-500/10' : 'border-red-500/30 bg-red-500/10',
          details: `ID: ${data?.relative_id}`
        }
      case 'delete_story':
        return {
          icon: <Trash2 className="w-4 h-4 text-red-400" />,
          title: 'История удалена',
          color: isSuccess ? 'border-red-500/30 bg-red-500/10' : 'border-red-500/30 bg-red-500/10',
          details: data?.key || 'История'
        }
      case 'get_relative':
        return {
          icon: <User className="w-4 h-4 text-cyan-400" />,
          title: 'Получен родственник',
          color: 'border-cyan-500/30 bg-cyan-500/10',
          details: result?.data ? `${result.data.first_name || ''} ${result.data.last_name || ''}`.trim() : 'Данные получены'
        }
      case 'get_all_relatives':
        return {
          icon: <User className="w-4 h-4 text-cyan-400" />,
          title: 'Список родственников',
          color: 'border-cyan-500/30 bg-cyan-500/10',
          details: `Найдено: ${result?.count || 0}`
        }
      case 'get_relationships':
        return {
          icon: <LinkIcon className="w-4 h-4 text-cyan-400" />,
          title: 'Список связей',
          color: 'border-cyan-500/30 bg-cyan-500/10',
          details: `Найдено: ${result?.count || 0}`
        }
      case 'search_relatives':
        return {
          icon: <User className="w-4 h-4 text-cyan-400" />,
          title: 'Поиск родственников',
          color: 'border-cyan-500/30 bg-cyan-500/10',
          details: `Найдено: ${result?.count || 0} по запросу "${data?.search_term || ''}"`
        }
      default:
        return {
          icon: <Bot className="w-4 h-4 text-orange" />,
          title: 'Действие выполнено',
          color: 'border-orange/30 bg-orange/10',
          details: action_type
        }
    }
  }

  const config = getActionConfig()
  const isSuccess = action.result?.success !== false && !declined && !reverted
  const borderColor = pending ? 'border-gray-500/30' : config.color.split(' ')[0]
  const bgColor = pending ? 'bg-gray-500/10' : config.color.split(' ')[1]

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} overflow-hidden transition-all duration-300 hover:shadow-lg ${pending ? 'ring-1 ring-gray-500/30' : ''}`}>
      {/* Заголовок карточки */}
      <div
        className="p-3 flex items-start gap-3 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="mt-0.5 flex-shrink-0">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-xs uppercase tracking-wider opacity-70 mb-0.5">
            {config.title}
          </div>
          <div className="text-sm font-medium text-gray-200 truncate">{config.details}</div>
        </div>
        <div className="flex items-center gap-2">
          {isSuccess && !pending && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          {!isSuccess && !pending && <XCircle className="w-4 h-4 text-red-500" />}
          {pending && <Hourglass className="w-4 h-4 text-gray-400 animate-pulse" />}
          <button className="text-gray-500 hover:text-white transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Развёрнутые детали */}
      {expanded && (
        <div className="px-3 pb-3 animate-in slide-in-from-top-2 duration-200">
          <div className="bg-charcoal-950/50 rounded-lg p-3 text-xs overflow-x-auto">
            {/* Отображение для add_story */}
            {action.action_type === 'add_story' && (
              <div className="whitespace-pre-wrap font-sans text-gray-300">
                {action.data?.value}
              </div>
            )}

            {/* Отображение для read-only actions */}
            {['get_relative', 'get_all_relatives', 'get_relationships', 'search_relatives'].includes(action.action_type) && action.result?.data && (
              <div className="space-y-2">
                {action.action_type === 'get_relative' ? (
                  <div className="text-gray-300 space-y-1">
                    <div><strong>Имя:</strong> {action.result.data.first_name} {action.result.data.middle_name || ''} {action.result.data.last_name}</div>
                    <div><strong>Пол:</strong> {action.result.data.gender || 'не указан'}</div>
                    {action.result.data.birth_date && <div><strong>Дата рождения:</strong> {action.result.data.birth_date}</div>}
                    {action.result.data.death_date && <div><strong>Дата смерти:</strong> {action.result.data.death_date}</div>}
                    {action.result.data.generation !== undefined && <div><strong>Поколение:</strong> {action.result.data.generation}</div>}
                    {action.result.data.context && Object.keys(action.result.data.context).length > 0 && (
                      <div><strong>Истории:</strong> {Object.keys(action.result.data.context).join(', ')}</div>
                    )}
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    {Array.isArray(action.result.data) ? (
                      action.result.data.map((item: any, idx: number) => (
                        <div key={idx} className="text-gray-300 border-b border-charcoal-700/50 py-1 last:border-0">
                          {item.first_name && item.last_name ? (
                            <span>{item.first_name} {item.last_name} (ID: {item.id})</span>
                          ) : item.relationship_type ? (
                            <span>ID {item.from_relative_id} → ID {item.to_relative_id} ({item.relationship_type})</span>
                          ) : (
                            <span>{JSON.stringify(item)}</span>
                          )}
                        </div>
                      ))
                    ) : (
                      <pre className="font-mono text-gray-400">{JSON.stringify(action.result.data, null, 2)}</pre>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Дефолтное отображение JSON */}
            {!['add_story', 'get_relative', 'get_all_relatives', 'get_relationships', 'search_relatives'].includes(action.action_type) && (
              <pre className="font-mono text-gray-400">{JSON.stringify(action.data, null, 2)}</pre>
            )}
          </div>

          {/* Ошибка */}
          {action.result && action.result.success === false && !pending && (
            <div className="mt-2 text-red-400 text-xs flex items-center gap-1.5 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
              <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{action.result.error}</span>
            </div>
          )}

          {/* Управление: принять / отменить */}
          {!reverted && !declined && controlsEnabled && !autoAccepted && (
            <>
              {pending && !autoAcceptEnabled && (
                <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAccept()
                    }}
                    disabled={accepting}
                    className="flex-1 px-3 py-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
                  >
                    {accepting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Принять
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDecline()
                    }}
                    disabled={declining}
                    className="flex-1 px-3 py-2.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-200 text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
                  >
                    {declining ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    Отклонить
                  </button>
                </div>
              )}

              {!pending && isSuccess && supportRevert.includes(action.action_type) && onRevert && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRevert()
                    }}
                    disabled={reverting}
                    className="w-full px-3 py-2.5 rounded-lg bg-red-500/12 hover:bg-red-500/22 text-red-200 text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
                  >
                    {reverting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    Отменить
                  </button>
                </div>
              )}
            </>
          )}
          {pending && (
            <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Действие ожидает вашего решения</span>
            </div>
          )}
          {!pending && !reverted && !declined && (
            <div className="mt-2 text-[11px] text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{autoAccepted ? 'Принято автоматически' : 'Принято'}</span>
            </div>
          )}
          {declined && (
            <div className="mt-2 text-[11px] text-red-300 flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              <span>Отклонено</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ==================== КОМПОНЕНТ: MARKDOWN РЕНДЕРЕР ====================
const MarkdownRenderer = ({ content }: { content: string }) => {
  // Простой рендеринг Markdown
  const formatText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="text-orange font-semibold">
            {part.slice(2, -2)}
          </strong>
        )
      }
      return part
    })
  }

  const lines = content.split('\n')

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />

        // Заголовки
        if (line.startsWith('### ')) {
          return (
            <h3 key={i} className="text-lg font-bold text-white mt-3">
              {formatText(line.slice(4))}
            </h3>
          )
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={i} className="text-xl font-bold text-white mt-4">
              {formatText(line.slice(3))}
            </h2>
          )
        }

        // Списки
        if (line.trim().startsWith('- ')) {
          return (
            <div key={i} className="flex gap-2 ml-2">
              <span className="text-orange mt-1">•</span>
              <span className="flex-1">{formatText(line.trim().slice(2))}</span>
            </div>
          )
        }

        // Нумерованные списки
        if (/^\d+\.\s/.test(line.trim())) {
          return (
            <div key={i} className="flex gap-2 ml-2">
              <span className="text-orange font-mono font-medium">
                {line.trim().split('.')[0]}.
              </span>
              <span className="flex-1">{formatText(line.trim().replace(/^\d+\.\s/, ''))}</span>
            </div>
          )
        }

        return (
          <p key={i} className="leading-relaxed">
            {formatText(line)}
          </p>
        )
      })}
    </div>
  )
}

// ==================== ОСНОВНОЙ КОМПОНЕНТ ====================
export default function AIAssistantPage() {
  const router = useRouter()
  const { message } = App.useApp()
  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const mounted = useRef(false)

  // Состояние чата
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingThinking, setStreamingThinking] = useState('')
  const [currentActions, setCurrentActions] = useState<ActionData[]>([])
  const [showHero, setShowHero] = useState(true)
  const [heroContentVisible, setHeroContentVisible] = useState(true)
  const [autoAccept, setAutoAccept] = useState(false)
  const [mode, setMode] = useState<'base' | 'smart'>('base')

  const chatContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const compactPrompts = useMemo(() => {
    const first = pickRandom(quickStartPrompts)
    let second = pickRandom(quickStartPrompts)
    if (second === first) second = pickRandom(quickStartPrompts)
    return [first, second]
  }, [])

  const normalizeAction = useCallback(
    (raw: any): ActionData => {
      const pending = raw?.result?.pending === true
      const incomingState = raw?.__meta?.state
      return {
        ...raw,
        __meta: {
          ...(raw.__meta || {}),
          state: pending ? 'pending' : incomingState ?? 'accepted',
          autoAccepted: !pending && autoAccept,
        },
      }
    },
    [autoAccept]
  )

  const executeAction = useCallback(async (action: ActionData): Promise<ActionData> => {
    if (!user) throw new Error('Не авторизован')
    const { action_type, data } = action

    switch (action_type) {
      case 'create_relative': {
        const res = await familyApi.createRelative(user.id, data)
        return {
          ...action,
          result: {
            success: true,
            id: res.id,
            name: `${res.first_name || ''} ${res.last_name || ''}`.trim(),
            data: res,
          },
          __meta: { ...(action.__meta || {}), state: 'accepted', autoAccepted: false },
        }
      }
      case 'create_relationship': {
        const res = await relationshipApi.createRelationship(user.id, data)
        return {
          ...action,
          result: { success: true, id: res.id, data: res },
          __meta: { ...(action.__meta || {}), state: 'accepted', autoAccepted: false },
        }
      }
      case 'update_relative': {
        const relativeId = data?.relative_id || data?.id
        if (!relativeId) throw new Error('Нет relative_id')
        const res = await familyApi.updateRelative(user.id, relativeId, data)
        return {
          ...action,
          result: { success: true, id: res.id, data: res },
          __meta: { ...(action.__meta || {}), state: 'accepted', autoAccepted: false },
        }
      }
      case 'delete_relative': {
        const relativeId = data?.relative_id || data?.id
        if (!relativeId) throw new Error('Нет relative_id')
        await familyApi.deleteRelative(user.id, relativeId)
        return {
          ...action,
          result: { success: true, id: relativeId },
          __meta: { ...(action.__meta || {}), state: 'accepted', autoAccepted: false },
        }
      }
      case 'delete_relationship': {
        const relId = data?.relationship_id || data?.id
        if (!relId) throw new Error('Нет relationship_id')
        await relationshipApi.deleteRelationship(user.id, relId)
        return {
          ...action,
          result: { success: true, id: relId },
          __meta: { ...(action.__meta || {}), state: 'accepted', autoAccepted: false },
        }
      }
      case 'search_relatives': {
        // read-only action, should not come here for execution usually,
        // but if it does (manual trigger), we handle it safely
        const res = await familyApi.searchRelatives(user.id, data.search_term)
        return {
          ...action,
          result: { success: true, count: res.length, data: res },
          __meta: { ...(action.__meta || {}), state: 'accepted', autoAccepted: false },
        }
      }
      default:
        throw new Error('Действие пока не поддерживается для ручного применения')
    }
  }, [user])

  // Обработка отмены действия (поддержка create_relative/create_relationship)
  const handleRevertAction = useCallback(async (action: ActionData) => {
    if (!user) return

    const { action_type, result } = action
    if (!result?.success) return

    try {
      if (action_type === 'create_relative' && result.id) {
        await familyApi.deleteRelative(user.id, result.id)
      } else if (action_type === 'create_relationship' && result.id) {
        await relationshipApi.deleteRelationship(user.id, result.id)
      } else {
        message.warning('Отмена этого действия пока не поддерживается')
        throw new Error('Not supported')
      }
    } catch (error) {
      throw error
    }
  }, [user, message])

  const updateActionInMessages = useCallback((messageId: string, index: number, updated: ActionData) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              actions: msg.actions?.map((a, i) => (i === index ? updated : a)),
            }
          : msg
      )
    )
  }, [])

  const handleDeclineAction = useCallback(
    async (messageId: string, index: number, action: ActionData) => {
      const declinedAction: ActionData = {
        ...action,
        result: { ...(action.result || {}), success: false, error: 'Отклонено пользователем' },
        __meta: { ...(action.__meta || {}), state: 'declined' },
      }
      updateActionInMessages(messageId, index, declinedAction)
    },
    [updateActionInMessages]
  )

  const handleAcceptAction = useCallback(
    async (messageId: string, index: number, action: ActionData) => {
      try {
        const updated = await executeAction(action)
        updateActionInMessages(messageId, index, updated)
      } catch (error: any) {
        message.error(error?.message || 'Не удалось применить действие')
        updateActionInMessages(messageId, index, {
          ...action,
          result: { ...(action.result || {}), success: false, error: error?.message || 'Ошибка применения' },
          __meta: { ...(action.__meta || {}), state: action.__meta?.state ?? 'pending' },
        })
      }
    },
    [executeAction, updateActionInMessages, message]
  )

  const handleRevertActionForMessage = useCallback(
    async (messageId: string, index: number, action: ActionData) => {
      await handleRevertAction(action)
      const reverted: ActionData = {
        ...action,
        __meta: { ...(action.__meta || {}), state: 'reverted' },
      }
      updateActionInMessages(messageId, index, reverted)
    },
    [handleRevertAction, updateActionInMessages]
  )

  const handleAcceptAll = useCallback(
    async (messageId: string, actions: ActionData[]) => {
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i]
        if (action.__meta?.state !== 'pending') continue
        try {
          const updated = await executeAction(action)
          updateActionInMessages(messageId, i, updated)
        } catch (error: any) {
          updateActionInMessages(messageId, i, {
            ...action,
            result: { ...(action.result || {}), success: false, error: error?.message || 'Ошибка применения' },
            __meta: { ...(action.__meta || {}), state: action.__meta?.state ?? 'pending' },
          })
        }
      }
      message.success('Действия применены')
    },
    [executeAction, updateActionInMessages, message]
  )

  const handleDeclineAll = useCallback(
    async (messageId: string, actions: ActionData[]) => {
      actions.forEach((action, i) => {
        if (action.__meta?.state !== 'pending') return
        updateActionInMessages(messageId, i, {
          ...action,
          result: { ...(action.result || {}), success: false, error: 'Отклонено пользователем' },
          __meta: { ...(action.__meta || {}), state: 'declined' },
        })
      })
      message.info('Действия отклонены')
    },
    [updateActionInMessages, message]
  )

  // Автоскролл
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleQuickStart = () => {
    setPrompt(pickRandom(quickStartPrompts))
  }

  const handleAskAdvice = () => {
    setPrompt(pickRandom(advicePrompts))
  }

  // Инициализация
  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    const fetchData = async () => {
      try {
        const userData = await authApi.me()
        setUser(userData)
        // Приветственное авто-сообщение убрано — информация в hero-блоке
        setMessages([])
      } catch (error) {
        const apiError = error as ApiError
        console.error('Fetch user error:', error)
        if (apiError.status === 401) {
          router.push('/auth')
        } else {
          message.error(getErrorMessage(apiError))
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router, message])

  // Автоскролл при изменении сообщений
  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, streamingThinking])

  // hero остается, но контент можно скрывать вручную

  // Отправка сообщения
  const handleSendMessage = useCallback(async () => {
    if (!prompt.trim() || isProcessing) return

    const userMessage: DisplayMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: prompt,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentPrompt = prompt
    setPrompt('')
    setHeroContentVisible(false)
    setShowHero(false)
    setIsProcessing(true)
    setStreamingContent('')
    setStreamingThinking('')
    setCurrentActions([])

    setTimeout(scrollToBottom, 100)

    try {
      let fullResponse = ''
      let fullThinking = ''
      const actions: ActionData[] = []

      for await (const chunk of streamUnified(currentPrompt, history, { mode, auto_accept: autoAccept })) {
        switch (chunk.type) {
          case 'thinking':
            fullThinking += chunk.content
            setStreamingThinking((prev) => prev + chunk.content)
            break

          case 'status':
            setStreamingThinking(chunk.content)
            break

          case 'text':
            fullResponse += chunk.content
            setStreamingContent((prev) => prev + chunk.content)
            break

          case 'warning':
            setMessages((prev) => [
              ...prev,
              {
                id: `warning-${Date.now()}`,
                type: 'warning',
                content: chunk.content,
                timestamp: new Date(),
              },
            ])
            break

          case 'action':
            // Парсим действие из строки
            try {
              const actionData = typeof chunk.content === 'string'
                ? JSON.parse(chunk.content)
                : chunk.content
              const normalized = normalizeAction(actionData)
              actions.push(normalized)
              setCurrentActions((prev) => [...prev, normalized])
            } catch (e) {
              console.error('Failed to parse action:', e)
            }
            break

          case 'error':
            setMessages((prev) => [
              ...prev,
              {
                id: `error-${Date.now()}`,
                type: 'error',
                content: chunk.content,
                timestamp: new Date(),
              },
            ])
            break

          case 'done':
            // Формируем итоговое сообщение
            if (fullResponse || actions.length > 0 || fullThinking) {
              const assistantMessage: DisplayMessage = {
                id: `assistant-${Date.now()}`,
                type: 'assistant',
                content: fullResponse,
                actions: actions,
                timestamp: new Date(),
              }

              // Если было thinking, добавляем его отдельным сообщением
              if (fullThinking) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `thinking-${Date.now()}`,
                    type: 'thinking',
                    content: fullThinking,
                    timestamp: new Date(),
                  },
                ])
              }

              setMessages((prev) => [...prev, assistantMessage])

              setHistory((prev) => [
                ...prev,
                { role: 'user', content: currentPrompt },
                { role: 'assistant', content: fullResponse },
              ])
            }
            setStreamingContent('')
            setStreamingThinking('')
            setCurrentActions([])
            break
        }
      }
    } catch (error) {
      message.error('Не удалось обработать сообщение')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }, [prompt, history, isProcessing, message, autoAccept, mode, normalizeAction])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal-950">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-charcoal-950 via-charcoal-900 to-charcoal-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-charcoal-700/50 bg-charcoal-900/50 backdrop-blur-xl flex-none h-16 z-50">
        <nav className="max-w-7xl mx-auto px-6 lg:px-8 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange to-orange-dark flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-orange/50">
              <TreePine className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-serif text-xl font-bold">
              <span className="text-white">Genetic</span>
              <span className="gradient-text">Tree</span>
            </span>
          </Link>

          <Button
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => router.push('/dashboard')}
            className="bg-charcoal-800/50 border-charcoal-700 hover:border-orange transition-all hover:shadow-lg"
          >
            Назад
          </Button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 max-w-6xl mx-auto w-full px-4 py-6 flex flex-col">
        {/* Chat Area */}
        <div
          ref={chatContainerRef}
          className="relative flex-1 overflow-y-auto mb-4 space-y-4 px-3 pb-3 pt-3 scroll-smooth scrollbar-thin scrollbar-thumb-charcoal-700 scrollbar-track-transparent rounded-3xl backdrop-blur-2xl shadow-[0_20px_60px_-25px_rgba(0,0,0,0.6)]"
        >
          {showHero && (
            <div className={`pointer-events-none absolute inset-0 rounded-3xl overflow-hidden z-0 transition-opacity duration-1000 ${heroContentVisible ? 'opacity-100' : 'opacity-40'}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/6 via-white/4 to-white/2 backdrop-blur-xl" />
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,#a855f7_0,transparent_30%),radial-gradient(circle_at_80%_30%,#22d3ee_0,transparent_28%),radial-gradient(circle_at_40%_80%,#f97316_0,transparent_28%)]" />
              {heroContentVisible && (
                <div className="relative h-full flex flex-col items-center justify-center text-center px-8 gap-3 animate-in fade-in duration-700">
                  <div className="px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-orange/80 bg-white/10 rounded-full inline-flex items-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    ИИ-помощник
                  </div>
                  <h3 className="text-2xl font-bold text-white drop-shadow-lg">ИИ-помощник для вашего древа</h3>
                  <p className="text-sm text-gray-100/90 max-w-2xl">
                    Быстро выполняйте действия: добавляйте родственников, связи, истории и советы. Можно начать с себя или создать любую семью. Все изменения можно принять или отменить.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 max-w-3xl">
                    {['Добавить родителя', 'Создать связь', 'Написать историю', 'Подсказка по поиску', 'Проверить дубликаты', 'Уточнить пол и поколение'].map((chip) => (
                      <span key={chip} className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-gray-100 backdrop-blur-sm">
                        {chip}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={handleQuickStart}
                      className="pointer-events-auto bg-orange/80 border-orange/60 text-white hover:bg-orange shadow-lg shadow-orange/40"
                      icon={<Sparkles className="w-4 h-4" />}
                    >
                      Быстрый старт
                    </Button>
                    <Button
                      onClick={handleAskAdvice}
                      className="pointer-events-auto bg-white/10 border-white/10 text-gray-100 hover:border-orange backdrop-blur-md"
                    >
                      Спросить совет
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          {messages.map((msg) => {
            const pendingActions = (msg.actions || []).filter((a) => a.__meta?.state === 'pending')

            return (
              <div
                key={msg.id}
                className={`flex z-10 relative ${
                  msg.type === 'user' ? 'justify-end' : 'justify-start'
                } animate-in fade-in slide-in-from-bottom-3 duration-500`}
              >
                <div
                  className={`flex gap-3 max-w-[85%] ${
                    msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                      msg.type === 'user'
                        ? 'bg-gradient-to-br from-orange to-orange-dark shadow-lg shadow-orange/30'
                        : msg.type === 'error'
                        ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/30'
                        : msg.type === 'warning'
                        ? 'bg-gradient-to-br from-yellow-500 to-amber-600 shadow-lg shadow-yellow-500/30'
                        : msg.type === 'thinking'
                        ? 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/30'
                        : 'bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-lg shadow-blue-500/30'
                    }`}
                  >
                    {msg.type === 'user' ? (
                      <User className="w-5 h-5 text-white" />
                    ) : msg.type === 'error' ? (
                      <XCircle className="w-5 h-5 text-white" />
                    ) : msg.type === 'warning' ? (
                      <AlertTriangle className="w-5 h-5 text-white" />
                    ) : msg.type === 'thinking' ? (
                      <Brain className="w-5 h-5 text-white animate-pulse" />
                    ) : (
                      <Bot className="w-5 h-5 text-white" />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`p-3.5 rounded-2xl shadow-xl backdrop-blur-sm transition-all hover:shadow-2xl ${
                        msg.type === 'user'
                          ? 'bg-orange/12 border border-orange/20 text-white rounded-tr-md'
                          : msg.type === 'warning'
                          ? 'bg-yellow-900/20 text-yellow-100 border border-yellow-700/50 rounded-tl-md'
                          : msg.type === 'error'
                          ? 'bg-red-900/25 text-red-100 border border-red-700/50 rounded-tl-md'
                          : msg.type === 'thinking'
                          ? 'bg-purple-900/20 text-purple-100 border border-purple-700/50 rounded-tl-md italic'
                          : 'bg-blue-900/15 text-gray-100 border border-blue-800/40 rounded-tl-md'
                      }`}
                    >
                      {/* Content */}
                      {msg.type === 'thinking' ? (
                        <div className="flex items-start gap-2">
                          <Brain className="w-4 h-4 text-purple-400 mt-1 flex-shrink-0 animate-pulse" />
                          <div className="prose prose-invert prose-sm max-w-none">
                            <p className="text-sm">{msg.content}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <MarkdownRenderer content={msg.content} />
                        </div>
                      )}

                      {/* Actions attached to message */}
          {msg.actions && msg.actions.length > 0 && (
            <div className="mt-3 space-y-2">
              {msg.actions.map((action, idx) => (
                <ActionCard
                  key={idx}
                  action={action}
                  onAccept={
                    action.__meta?.state === 'pending'
                      ? async () => handleAcceptAction(msg.id, idx, action)
                      : undefined
                  }
                  onDecline={
                    action.__meta?.state === 'pending'
                      ? async () => handleDeclineAction(msg.id, idx, action)
                      : undefined
                  }
                  onRevert={
                    action.__meta?.state !== 'pending' && ['create_relative', 'create_relationship'].includes(action.action_type)
                      ? async () => handleRevertActionForMessage(msg.id, idx, action)
                      : undefined
                  }
                  autoAcceptEnabled={autoAccept}
                />
              ))}
            </div>
          )}

          {/* Bulk controls */}
          {pendingActions.length > 0 && !autoAccept && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => handleAcceptAll(msg.id, msg.actions || [])}
                className="flex-1 px-3 py-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                Принять все
              </button>
              <button
                onClick={() => handleDeclineAll(msg.id, msg.actions || [])}
                className="flex-1 px-3 py-2.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-100 text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <XCircle className="w-4 h-4" />
                Отклонить все
              </button>
            </div>
          )}
        </div>
        <div className="text-[11px] opacity-60 mt-1 ml-1 self-end text-right">
            {msg.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
      </div>
    </div>
  </div>
)
})}

          {/* Streaming Thinking */}
          {streamingThinking && (
            <div className="flex justify-start animate-in fade-in duration-300 z-10 relative">
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div className="p-4 rounded-2xl rounded-tl-md bg-purple-900/20 border border-purple-700/50 text-purple-100 shadow-xl">
                  <div className="flex items-start gap-2 italic">
                    <Brain className="w-4 h-4 text-purple-400 mt-1 flex-shrink-0 animate-pulse" />
                    <div className="text-sm bg-gradient-to-r from-purple-200 via-white to-purple-200 bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer whitespace-pre-wrap">
                      {streamingThinking}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Streaming Message */}
          {streamingContent && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-lg shadow-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="p-4 rounded-2xl rounded-tl-md bg-charcoal-800/50 border border-charcoal-700/50 text-gray-100 shadow-xl">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <MarkdownRenderer content={streamingContent} />
                    <span className="inline-block w-2 h-4 bg-orange ml-1 animate-pulse" />
                  </div>

                  {/* Current Actions being executed */}
                  {currentActions.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {currentActions.map((action, idx) => (
                        <ActionCard
                          key={idx}
                          action={action}
                          onRevert={async () => await handleRevertAction(action)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isProcessing && !streamingContent && !streamingThinking && (
            <div className="flex justify-start">
              <div className="flex items-center gap-3 text-gray-400 ml-14 bg-charcoal-900/50 px-4 py-2.5 rounded-full border border-charcoal-700/50 shadow-lg backdrop-blur-sm">
                <RefreshCw className="w-4 h-4 animate-spin text-orange" />
                <span className="text-sm font-medium">ИИ думает...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex-none bg-white/10 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 shadow-2xl relative z-10">
          {/* Quick Prompts */}
            <div className="flex gap-3 items-end">
            <TextArea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value)
              }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Напишите команду или задайте вопрос..."
              autoSize={{ minRows: 1, maxRows: 6 }}
              className="flex-1 bg-transparent border-none focus:shadow-none text-white resize-none py-2.5 px-3 placeholder:text-gray-500"
              maxLength={5000}
            />
            <button
              onClick={handleSendMessage}
              disabled={!prompt.trim() || isProcessing}
              className={`relative w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                isProcessing
                  ? 'bg-gradient-to-br from-orange/70 to-orange-dark/70'
                  : 'bg-gradient-to-br from-orange to-orange-dark hover:scale-105 hover:shadow-lg hover:shadow-orange/50'
              } disabled:opacity-50`}
            >
              {isProcessing ? (
                <RefreshCw className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Send className={`w-6 h-6 text-white ${prompt.trim() ? 'animate-pulse' : ''}`} />
              )}
            </button>
          </div>
          <div className="px-3 pb-1 pt-2 flex items-center justify-between text-xs text-gray-300 gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <Tooltip title="Автоматически применять действия ИИ без запроса подтверждения" placement="top">
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/8 border border-white/15 min-h-[44px]">
                  <span className="text-gray-100 text-[13px]">Автопринятие</span>
                  <Switch size="default" checked={autoAccept} onChange={(v) => setAutoAccept(v)} />
                </div>
              </Tooltip>
              <Tooltip title="Выбор модели: base=gpt-4o-mini, smart=gpt-4o" placement="top">
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/8 border border-white/15 min-h-[44px]">
                  <span className="text-gray-100 text-[13px]">Режим</span>
                  <Switch
                    size="default"
                    checked={mode === 'smart'}
                    onChange={(v) => setMode(v ? 'smart' : 'base')}
                  />
                  <span className="text-gray-100 text-[13px] min-w-[130px]">
                    {mode === 'smart' ? 'Smart (gpt-4o)' : 'Base (gpt-4o-mini)'}
                  </span>
                </div>
              </Tooltip>
            </div>
            <span className="text-gray-200">{prompt.length} / 5000</span>
          </div>
        </div>
      </main>
    </div>
  )
}
