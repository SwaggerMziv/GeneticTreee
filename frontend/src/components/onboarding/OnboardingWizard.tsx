'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  TreePine,
  Users,
  Bot,
  BookOpen,
  Send,
  FileText,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  MessageCircle,
  Camera,
  Rocket,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useOnboarding } from '@/hooks/use-onboarding'
import { useUser } from '@/components/providers/UserProvider'
import { cn } from '@/lib/utils'

function StepIndicator({
  current,
  total,
  onStepClick,
}: {
  current: number
  total: number
  onStepClick: (step: number) => void
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          onClick={() => onStepClick(i)}
          className={cn(
            'h-2 rounded-full transition-all duration-300 cursor-pointer hover:opacity-80',
            i === current
              ? 'w-8 bg-orange'
              : i < current
              ? 'w-2 bg-orange/50'
              : 'w-2 bg-muted'
          )}
        />
      ))}
    </div>
  )
}

/* ─── Step 0: Welcome — Auto-building mini tree ─── */
function WelcomeStep() {
  const treeNodes = [
    { id: 'you', label: 'Вы', x: 150, y: 130, color: '#F97316' },
    { id: 'mom', label: 'Мама', x: 90, y: 70, color: '#EC4899' },
    { id: 'dad', label: 'Папа', x: 210, y: 70, color: '#3B82F6' },
    { id: 'grandma', label: 'Бабушка', x: 90, y: 10, color: '#8B5CF6' },
  ]

  const connections = [
    { from: 'you', to: 'mom' },
    { from: 'you', to: 'dad' },
    { from: 'mom', to: 'grandma' },
  ]

  const [visibleCount, setVisibleCount] = useState(0)
  const [skipped, setSkipped] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalNodes = treeNodes.length
  const allVisible = visibleCount >= totalNodes

  useEffect(() => {
    if (skipped || allVisible) return
    timerRef.current = setTimeout(() => {
      setVisibleCount((c) => c + 1)
    }, 800)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [visibleCount, skipped, allVisible])

  const handleSkip = () => {
    setSkipped(true)
    setVisibleCount(totalNodes)
  }

  const getNode = (id: string) => treeNodes.find((n) => n.id === id)

  return (
    <div className="space-y-4">
      <div className="relative bg-muted/30 rounded-xl border border-border overflow-hidden" style={{ height: 200 }}>
        <svg width="300" height="180" viewBox="0 0 300 180" className="mx-auto block">
          {connections.map((conn) => {
            const from = getNode(conn.from)
            const to = getNode(conn.to)
            if (!from || !to) return null
            const fromIdx = treeNodes.findIndex((n) => n.id === conn.from)
            const toIdx = treeNodes.findIndex((n) => n.id === conn.to)
            const visible = visibleCount > fromIdx && visibleCount > toIdx
            return (
              <line
                key={`${conn.from}-${conn.to}`}
                x1={from.x}
                y1={from.y + 16}
                x2={to.x}
                y2={to.y + 16}
                stroke="currentColor"
                strokeWidth={2}
                className={cn(
                  'text-border transition-all duration-500',
                  visible ? 'opacity-100' : 'opacity-0'
                )}
              />
            )
          })}
          {treeNodes.map((node, i) => {
            const visible = i < visibleCount
            return (
              <g
                key={node.id}
                className={cn('transition-all duration-500', visible ? 'opacity-100' : 'opacity-0')}
                style={{ transform: visible ? 'scale(1)' : 'scale(0.5)', transformOrigin: `${node.x}px ${node.y + 16}px` }}
              >
                <rect
                  x={node.x - 36}
                  y={node.y}
                  width={72}
                  height={32}
                  rx={8}
                  fill={node.color}
                  opacity={0.15}
                  stroke={node.color}
                  strokeWidth={1.5}
                />
                <text
                  x={node.x}
                  y={node.y + 20}
                  textAnchor="middle"
                  fill={node.color}
                  fontSize={13}
                  fontWeight={600}
                >
                  {node.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {!allVisible ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full border-dashed text-muted-foreground"
          onClick={handleSkip}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Ускорить
        </Button>
      ) : (
        <p className="text-center text-sm text-orange font-medium animate-in fade-in slide-in-from-bottom-2">
          Вот что вы сможете построить!
        </p>
      )}
    </div>
  )
}

/* ─── Step 1: Build Tree — Two paths ─── */
function BuildTreeStep() {
  const [selected, setSelected] = useState<'manual' | 'ai' | null>(null)

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm text-center">
        Выберите способ, который вам больше нравится
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* Manual card */}
        <button
          onClick={() => setSelected('manual')}
          className={cn(
            'relative text-left p-4 rounded-xl border transition-all duration-300',
            selected === 'manual'
              ? 'border-orange/50 bg-orange/5 ring-2 ring-orange/20'
              : 'border-border bg-muted/30 hover:border-orange/20'
          )}
        >
          {selected === 'manual' && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-orange flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <h4 className="text-sm font-semibold mb-2">Вручную</h4>
          <div className="space-y-1.5">
            {['Имя', 'Пол', 'Дата рождения', 'Фото'].map((field) => (
              <div key={field} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                <span className="text-xs text-muted-foreground">{field}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/70 mt-2">На странице «Древо»</p>
        </button>

        {/* AI card */}
        <button
          onClick={() => setSelected('ai')}
          className={cn(
            'relative text-left p-4 rounded-xl border transition-all duration-300',
            selected === 'ai'
              ? 'border-orange/50 bg-orange/5 ring-2 ring-orange/20'
              : 'border-border bg-muted/30 hover:border-orange/20'
          )}
        >
          {selected === 'ai' && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-orange flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5 text-purple-500" />
          </div>
          <h4 className="text-sm font-semibold mb-2">ИИ-ассистент</h4>
          <div className="bg-muted/50 rounded-lg p-2 space-y-1.5">
            <div className="bg-blue-500 text-white text-[10px] rounded-lg rounded-br-sm px-2 py-1 ml-auto max-w-[90%]">
              Добавь маму Анна 1965
            </div>
            <div className="bg-background border border-border text-[10px] rounded-lg rounded-bl-sm px-2 py-1 max-w-[90%]">
              Готово! Мама добавлена
            </div>
          </div>
        </button>
      </div>

      {selected && (
        <p className="text-center text-sm text-orange font-medium animate-in fade-in slide-in-from-bottom-2">
          Оба способа всегда доступны!
        </p>
      )}
    </div>
  )
}

/* ─── Step 2: Invitations & Stories ─── */
function InvitationsStoriesStep() {
  const [chatStep, setChatStep] = useState(0)

  const badges = [
    { icon: Send, label: 'Отправьте ссылку', desc: 'Telegram-приглашение', color: 'bg-blue-500/10 text-blue-500' },
    { icon: Bot, label: 'Бот проведёт интервью', desc: 'Вопросы с ИИ', color: 'bg-green-500/10 text-green-500' },
    { icon: Camera, label: 'Истории с фото', desc: 'Текст, фото, голос', color: 'bg-purple-500/10 text-purple-500' },
  ]

  const chatMessages = [
    { from: 'bot', text: 'Расскажите, какое ваше самое яркое воспоминание о бабушке?' },
    { from: 'user', text: 'Помню, как она пекла пирожки каждое воскресенье. У меня есть фото!' },
    { from: 'bot', text: '✅ История сохранена! Фото добавлено к воспоминанию.' },
  ]

  return (
    <div className="space-y-4">
      {/* Info badges */}
      <div className="flex gap-2">
        {badges.map((b) => (
          <div key={b.label} className="flex-1 flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-border bg-muted/30 text-center">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', b.color)}>
              <b.icon className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-medium leading-tight">{b.label}</span>
            <span className="text-[9px] text-muted-foreground leading-tight">{b.desc}</span>
          </div>
        ))}
      </div>

      {/* Mini chat demo */}
      <div className="bg-muted/30 rounded-xl border border-border p-3 space-y-2">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange to-orange-dark flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-medium">GeneticTree Bot</span>
        </div>

        <div className="space-y-2 min-h-[80px]">
          {chatMessages.slice(0, chatStep).map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex animate-in fade-in slide-in-from-bottom-1 duration-300',
                msg.from === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div className={cn(
                'max-w-[85%] px-2.5 py-1.5 rounded-xl text-xs',
                msg.from === 'user'
                  ? 'bg-blue-500 text-white rounded-br-sm'
                  : 'bg-muted border border-border rounded-bl-sm'
              )}>
                {msg.text}
              </div>
            </div>
          ))}
          {chatStep === 0 && (
            <div className="flex items-center justify-center h-16 text-muted-foreground text-xs">
              <MessageCircle className="w-3.5 h-3.5 mr-1.5 opacity-50" />
              Нажмите кнопку ниже...
            </div>
          )}
        </div>
      </div>

      {chatStep < chatMessages.length ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={() => setChatStep((s) => s + 1)}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Следующее сообщение ({chatStep + 1}/{chatMessages.length})
        </Button>
      ) : (
        <p className="text-center text-sm text-orange font-medium animate-in fade-in slide-in-from-bottom-2">
          Истории с фото и голосом — всё сохраняется автоматически
        </p>
      )}
    </div>
  )
}

/* ─── Step 3: Book — Style picker + generation demo ─── */
function BookStep() {
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  const styles = [
    { id: 'classic', label: 'Классика', emoji: '📜', desc: 'Элегантный стиль', color: 'border-amber-500/50 bg-amber-500/5' },
    { id: 'modern', label: 'Современный', emoji: '✨', desc: 'Минимализм', color: 'border-blue-500/50 bg-blue-500/5' },
    { id: 'vintage', label: 'Винтаж', emoji: '🕰️', desc: 'Ретро-стиль', color: 'border-purple-500/50 bg-purple-500/5' },
  ]

  const handleGenerate = () => {
    setGenerating(true)
    setProgress(0)
  }

  useEffect(() => {
    if (!generating || done) return
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval)
          setDone(true)
          setGenerating(false)
          return 100
        }
        return p + 4
      })
    }, 60)
    return () => clearInterval(interval)
  }, [generating, done])

  const stages = [
    { threshold: 0, text: 'Сбор историй...' },
    { threshold: 30, text: 'Оформление глав...' },
    { threshold: 60, text: 'Генерация PDF...' },
    { threshold: 90, text: 'Готово!' },
  ]
  const currentStage = [...stages].reverse().find((s) => progress >= s.threshold)

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm text-center">
        Выберите стиль и нажмите «Создать книгу»
      </p>

      {/* Style picker */}
      <div className="grid grid-cols-3 gap-2">
        {styles.map((s) => (
          <button
            key={s.id}
            onClick={() => !generating && !done && setSelectedStyle(s.id)}
            className={cn(
              'p-3 rounded-xl border-2 text-center transition-all duration-300',
              selectedStyle === s.id
                ? s.color + ' ring-2 ring-orange/20'
                : 'border-border bg-muted/30 hover:border-muted-foreground/30',
              (generating || done) && 'pointer-events-none'
            )}
          >
            <span className="text-2xl block mb-1">{s.emoji}</span>
            <span className="text-xs font-semibold block">{s.label}</span>
            <span className="text-[9px] text-muted-foreground">{s.desc}</span>
          </button>
        ))}
      </div>

      {/* Progress / Generate */}
      {(generating || done) ? (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{done ? 'Готово!' : currentStage?.text}</span>
            <span className="font-mono text-foreground">{Math.min(progress, 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-200',
                done ? 'bg-green-500' : 'bg-gradient-to-r from-orange to-orange-dark'
              )}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          {done && (
            <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 animate-in fade-in zoom-in-95">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-sm font-medium">Книга готова!</span>
            </div>
          )}
        </div>
      ) : (
        <Button
          className="w-full bg-gradient-to-r from-orange to-orange-dark text-white"
          onClick={handleGenerate}
          disabled={!selectedStyle}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Создать книгу
        </Button>
      )}
    </div>
  )
}

/* ─── Step 4: Let's Go — Summary + navigation ─── */
function LetsGoStep({ onNavigate }: { onNavigate: (path: string) => void }) {
  const checklist = [
    { icon: TreePine, label: 'Постройте семейное древо', color: 'text-orange' },
    { icon: Send, label: 'Пригласите родственников', color: 'text-blue-500' },
    { icon: BookOpen, label: 'Создайте семейную книгу', color: 'text-purple-500' },
  ]

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {checklist.map((item) => (
          <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <item.icon className={cn('w-4 h-4', item.color)} />
            </div>
            <span className="text-sm font-medium">{item.label}</span>
            <Check className="w-4 h-4 text-muted-foreground/40 ml-auto" />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Button
          className="w-full bg-gradient-to-r from-orange to-orange-dark text-white hover:shadow-glow-orange"
          onClick={() => onNavigate('/tree')}
        >
          <Rocket className="w-4 h-4 mr-2" />
          Перейти к древу
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onNavigate('/dashboard/ai-assistant')}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Попробовать ИИ-ассистента
        </Button>
      </div>
    </div>
  )
}

/* ─── Main Wizard ─── */
export default function OnboardingWizard() {
  const { user } = useUser()
  const router = useRouter()
  const {
    showOnboarding,
    setShowOnboarding,
    step,
    setStep,
    nextStep,
    prevStep,
    completeOnboarding,
  } = useOnboarding(user?.id)

  const handleNavigate = useCallback((path: string) => {
    completeOnboarding()
    router.push(path)
  }, [completeOnboarding, router])

  const steps = [
    {
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange to-orange-dark flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
      ),
      title: 'Создадим семейную книгу!',
      description: 'Посмотрите, как строится ваше семейное древо.',
      content: <WelcomeStep />,
    },
    {
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <Users className="w-8 h-8 text-white" />
        </div>
      ),
      title: 'Как добавлять родственников',
      description: 'Два способа — вручную или через ИИ-ассистента.',
      content: <BuildTreeStep />,
    },
    {
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
          <Send className="w-8 h-8 text-white" />
        </div>
      ),
      title: 'Приглашения и истории',
      description: 'Пригласите семью — бот соберёт их воспоминания с фото.',
      content: <InvitationsStoriesStep />,
    },
    {
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
          <FileText className="w-8 h-8 text-white" />
        </div>
      ),
      title: 'Создайте книгу',
      description: 'Выберите стиль — и все истории станут PDF-книгой.',
      content: <BookStep />,
    },
    {
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
          <Rocket className="w-8 h-8 text-white" />
        </div>
      ),
      title: 'Всё готово!',
      description: 'Выберите, с чего начать.',
      content: <LetsGoStep onNavigate={handleNavigate} />,
    },
  ]

  const totalSteps = steps.length
  const isLastStep = step === totalSteps - 1
  const currentStep = steps[step] ?? steps[0]

  const handleNext = useCallback(() => {
    if (isLastStep) {
      completeOnboarding()
    } else {
      nextStep()
    }
  }, [isLastStep, completeOnboarding, nextStep])

  const handleSkip = useCallback(() => {
    completeOnboarding()
  }, [completeOnboarding])

  if (!showOnboarding) return null

  return (
    <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="text-center items-center pt-2">
          {currentStep.icon}
          <DialogTitle className="text-xl font-serif mt-3">
            {currentStep.title}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {currentStep.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-1 max-h-[55vh] overflow-y-auto">
          {currentStep.content}
        </div>

        <StepIndicator current={step} total={totalSteps} onStepClick={setStep} />

        <div className="flex items-center justify-between pt-1">
          <div>
            {step > 0 ? (
              <Button variant="ghost" size="sm" onClick={prevStep}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Назад
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
                Пропустить
              </Button>
            )}
          </div>
          {!isLastStep && (
            <Button onClick={handleNext} className="bg-gradient-to-r from-orange to-orange-dark text-white hover:shadow-glow-orange">
              Далее
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
