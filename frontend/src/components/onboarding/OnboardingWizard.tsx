'use client'

import { useCallback, useRef, useState } from 'react'
import {
  User as UserIcon,
  Users,
  Send,
  ArrowRight,
  ArrowLeft,
  Check,
  Copy,
  Plus,
  Trash2,
  Loader2,
  TreePine,
  Sparkles,
  Bot,
  BookOpen,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useOnboarding } from '@/hooks/use-onboarding'
import { useUser } from '@/components/providers/UserProvider'
import { familyApi, relationshipApi } from '@/lib/api/family'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { FamilyRelative, Gender, RelationshipType } from '@/types'

/* ─── Types ─── */

interface SelfFormData {
  first_name: string
  last_name: string
  birth_date: string
  gender: Gender
}

interface FamilyMember {
  id: string
  first_name: string
  last_name: string
  relationLabel: string
  relationshipType: RelationshipType
  fromIsSelf: boolean
  gender: Gender
}

const EXTRA_RELATION_OPTIONS: {
  label: string
  type: RelationshipType
  fromIsSelf: boolean
  gender: Gender
}[] = [
  { label: 'Брат', type: 'brother', fromIsSelf: false, gender: 'male' },
  { label: 'Сестра', type: 'sister', fromIsSelf: false, gender: 'female' },
  { label: 'Бабушка', type: 'grandmother', fromIsSelf: false, gender: 'female' },
  { label: 'Дедушка', type: 'grandfather', fromIsSelf: false, gender: 'male' },
  { label: 'Супруг', type: 'husband', fromIsSelf: false, gender: 'male' },
  { label: 'Супруга', type: 'wife', fromIsSelf: false, gender: 'female' },
  { label: 'Сын', type: 'son', fromIsSelf: true, gender: 'male' },
  { label: 'Дочь', type: 'daughter', fromIsSelf: true, gender: 'female' },
]

// Info steps are steps 0-3, functional steps are 4-6
const INFO_STEPS_COUNT = 4
const TOTAL_STEPS = 7

/* ─── Step Indicator ─── */

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            'h-2 rounded-full transition-all duration-300',
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

/* ─── Info Step Component ─── */

function InfoItem({
  icon: Icon,
  color,
  text,
}: {
  icon: React.ElementType
  color: string
  text: string
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/30">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', color)}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm leading-relaxed">{text}</span>
    </div>
  )
}

/* ─── Info Step 0: Welcome ─── */

function WelcomeInfoStep() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground text-center">
        GeneticTree поможет собрать и сохранить историю вашей семьи. Вот как это работает:
      </p>
      <InfoItem
        icon={TreePine}
        color="bg-orange/10 text-orange"
        text="Вы создаёте семейное древо — добавляете себя и родственников"
      />
      <InfoItem
        icon={Send}
        color="bg-blue-500/10 text-blue-500"
        text="Отправляете приглашения в Telegram — бот проведёт интервью"
      />
      <InfoItem
        icon={BookOpen}
        color="bg-purple-500/10 text-purple-500"
        text="Из собранных историй создаётся семейная книга в PDF"
      />
    </div>
  )
}

/* ─── Info Step 1: Tree Building ─── */

function TreeInfoStep() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground text-center">
        Два способа добавлять родственников — выбирайте удобный
      </p>
      <InfoItem
        icon={Users}
        color="bg-blue-500/10 text-blue-500"
        text="Вручную — заполните карточку с именем, датой рождения и фото на странице «Древо»"
      />
      <InfoItem
        icon={Sparkles}
        color="bg-purple-500/10 text-purple-500"
        text="Через ИИ-ассистента — просто напишите «Добавь маму Анна 1965» в чате"
      />
      <p className="text-xs text-muted-foreground text-center mt-2">
        Оба способа всегда доступны — можно комбинировать
      </p>
    </div>
  )
}

/* ─── Info Step 2: Telegram Bot ─── */

function BotInfoStep() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground text-center">
        Telegram-бот — главный инструмент сбора воспоминаний
      </p>
      <InfoItem
        icon={Send}
        color="bg-blue-500/10 text-blue-500"
        text="Вы отправляете родственнику персональную ссылку-приглашение в Telegram"
      />
      <InfoItem
        icon={Bot}
        color="bg-green-500/10 text-green-500"
        text="Бот проводит интервью с ИИ — задаёт вопросы о семье, событиях, воспоминаниях"
      />
      <InfoItem
        icon={Check}
        color="bg-cyan-500/10 text-cyan-500"
        text="Родственник отвечает текстом, голосом или фото — всё сохраняется автоматически"
      />
    </div>
  )
}

/* ─── Info Step 3: Book ─── */

function BookInfoStep() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground text-center">
        Все собранные истории можно превратить в семейную книгу
      </p>
      <InfoItem
        icon={BookOpen}
        color="bg-purple-500/10 text-purple-500"
        text="Выберите стиль оформления — классический, современный или винтажный"
      />
      <InfoItem
        icon={Sparkles}
        color="bg-amber-500/10 text-amber-500"
        text="ИИ оформит истории в главы, добавит фотографии и создаст PDF-книгу"
      />
      <p className="text-xs text-muted-foreground text-center mt-2">
        Чем больше историй соберёте — тем интереснее получится книга
      </p>
    </div>
  )
}

/* ─── Functional Step: About You ─── */

function AboutYouStep({
  form,
  setForm,
}: {
  form: SelfFormData
  setForm: React.Dispatch<React.SetStateAction<SelfFormData>>
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Имя <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="Иван"
            value={form.first_name}
            onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Фамилия <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="Иванов"
            value={form.last_name}
            onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Дата рождения</label>
        <Input
          type="date"
          value={form.birth_date}
          onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Пол</label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={form.gender === 'male' ? 'default' : 'outline'}
            className={cn(
              'flex-1',
              form.gender === 'male' && 'bg-blue-500 hover:bg-blue-600 text-white'
            )}
            onClick={() => setForm((f) => ({ ...f, gender: 'male' }))}
          >
            Мужской
          </Button>
          <Button
            type="button"
            variant={form.gender === 'female' ? 'default' : 'outline'}
            className={cn(
              'flex-1',
              form.gender === 'female' && 'bg-pink-500 hover:bg-pink-600 text-white'
            )}
            onClick={() => setForm((f) => ({ ...f, gender: 'female' }))}
          >
            Женский
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Functional Step: Your Family ─── */

function YourFamilyStep({
  members,
  setMembers,
}: {
  members: FamilyMember[]
  setMembers: React.Dispatch<React.SetStateAction<FamilyMember[]>>
}) {
  const [showExtra, setShowExtra] = useState(false)

  const updateMember = (id: string, field: keyof FamilyMember, value: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    )
  }

  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  const addMember = (option: (typeof EXTRA_RELATION_OPTIONS)[number]) => {
    setMembers((prev) => [
      ...prev,
      {
        id: `extra_${Date.now()}`,
        first_name: '',
        last_name: '',
        relationLabel: option.label,
        relationshipType: option.type,
        fromIsSelf: option.fromIsSelf,
        gender: option.gender,
      },
    ])
    setShowExtra(false)
  }

  const momDad = members.filter((m) => m.id === 'mom' || m.id === 'dad')
  const extras = members.filter((m) => m.id !== 'mom' && m.id !== 'dad')

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        Добавьте ближайших родственников. Можно заполнить только имя.
      </p>

      {momDad.map((member) => (
        <div key={member.id} className="p-3 rounded-xl border border-border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{member.relationLabel}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Имя"
              value={member.first_name}
              onChange={(e) => updateMember(member.id, 'first_name', e.target.value)}
            />
            <Input
              placeholder="Фамилия"
              value={member.last_name}
              onChange={(e) => updateMember(member.id, 'last_name', e.target.value)}
            />
          </div>
        </div>
      ))}

      {extras.map((member) => (
        <div key={member.id} className="p-3 rounded-xl border border-border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{member.relationLabel}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeMember(member.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Имя"
              value={member.first_name}
              onChange={(e) => updateMember(member.id, 'first_name', e.target.value)}
            />
            <Input
              placeholder="Фамилия"
              value={member.last_name}
              onChange={(e) => updateMember(member.id, 'last_name', e.target.value)}
            />
          </div>
        </div>
      ))}

      {showExtra ? (
        <div className="p-3 rounded-xl border border-dashed border-orange/40 bg-orange/5 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Выберите родство:</p>
          <div className="flex flex-wrap gap-1.5">
            {EXTRA_RELATION_OPTIONS.map((opt) => (
              <Button
                key={opt.type}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => addMember(opt)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setShowExtra(false)}
          >
            Отмена
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={() => setShowExtra(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить ещё родственника
        </Button>
      )}
    </div>
  )
}

/* ─── Functional Step: Invite Family ─── */

function InviteFamilyStep({
  relatives,
  invitations,
  onGenerate,
  generatingId,
}: {
  relatives: FamilyRelative[]
  invitations: Record<number, string>
  onGenerate: (relativeId: number) => void
  generatingId: number | null
}) {
  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('Ссылка скопирована')
  }

  if (relatives.length === 0) {
    return (
      <div className="text-center py-6 space-y-2">
        <p className="text-muted-foreground text-sm">
          Вы не добавили родственников на предыдущем шаге.
        </p>
        <p className="text-muted-foreground text-xs">
          Вы можете пригласить их позже со страницы древа.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground text-center">
        Отправьте ссылку родственнику — бот проведёт интервью и соберёт их воспоминания
      </p>

      {relatives.map((rel) => {
        const url = invitations[rel.id]
        const isGenerating = generatingId === rel.id

        return (
          <div
            key={rel.id}
            className="p-3 rounded-xl border border-border bg-muted/30 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {rel.first_name} {rel.last_name || ''}
              </span>
              {url ? (
                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <Check className="w-3.5 h-3.5" />
                  Готово
                </div>
              ) : null}
            </div>

            {url ? (
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={url}
                  className="text-xs h-8 bg-background"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0"
                  onClick={() => copyToClipboard(url)}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onGenerate(rel.id)}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 mr-2" />
                )}
                Сгенерировать ссылку
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Main Wizard ─── */

export default function OnboardingWizard() {
  const { user, refreshStats } = useUser()
  const {
    showOnboarding,
    step,
    setStep,
    nextStep,
    prevStep,
    completeOnboarding,
    createdRelatives,
    addCreatedRelative,
  } = useOnboarding(user?.id)

  // Functional step state
  const [selfForm, setSelfForm] = useState<SelfFormData>({
    first_name: '',
    last_name: '',
    birth_date: '',
    gender: 'male',
  })
  const [selfRelativeId, setSelfRelativeId] = useState<number | null>(null)

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    {
      id: 'mom',
      first_name: '',
      last_name: '',
      relationLabel: 'Мама',
      relationshipType: 'mother',
      fromIsSelf: false,
      gender: 'female',
    },
    {
      id: 'dad',
      first_name: '',
      last_name: '',
      relationLabel: 'Папа',
      relationshipType: 'father',
      fromIsSelf: false,
      gender: 'male',
    },
  ])

  const [invitations, setInvitations] = useState<Record<number, string>>({})
  const [generatingId, setGeneratingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const completingRef = useRef(false)

  const canProceedAboutYou =
    selfForm.first_name.trim() !== '' && selfForm.last_name.trim() !== ''

  // About You → create self relative
  const handleAboutYouNext = useCallback(async () => {
    if (!user || !canProceedAboutYou) return
    setLoading(true)
    try {
      const relative = await familyApi.createRelative(user.id, {
        first_name: selfForm.first_name.trim(),
        last_name: selfForm.last_name.trim(),
        birth_date: selfForm.birth_date || undefined,
        gender: selfForm.gender,
        generation: 0,
      })
      setSelfRelativeId(relative.id)
      addCreatedRelative(relative)
      nextStep()
    } catch {
      toast.error('Не удалось сохранить данные. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }, [user, selfForm, canProceedAboutYou, addCreatedRelative, nextStep])

  // Your Family → create family members + relationships
  const handleFamilyNext = useCallback(async () => {
    if (!user || selfRelativeId === null) return

    const filledMembers = familyMembers.filter((m) => m.first_name.trim() !== '')
    if (filledMembers.length === 0) {
      nextStep()
      return
    }

    setLoading(true)
    try {
      for (const member of filledMembers) {
        const created = await familyApi.createRelative(user.id, {
          first_name: member.first_name.trim(),
          last_name: member.last_name.trim() || undefined,
          gender: member.gender,
          generation:
            member.relationshipType === 'mother' || member.relationshipType === 'father'
              ? -1
              : member.relationshipType === 'grandmother' ||
                member.relationshipType === 'grandfather'
              ? -2
              : member.relationshipType === 'son' || member.relationshipType === 'daughter'
              ? 1
              : 0,
        })

        addCreatedRelative(created)

        if (member.fromIsSelf) {
          await relationshipApi.createRelationship(user.id, {
            from_relative_id: selfRelativeId,
            to_relative_id: created.id,
            relationship_type: member.relationshipType,
          })
        } else {
          await relationshipApi.createRelationship(user.id, {
            from_relative_id: created.id,
            to_relative_id: selfRelativeId,
            relationship_type: member.relationshipType,
          })
        }
      }

      nextStep()
    } catch {
      toast.error('Не удалось добавить родственников. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }, [user, selfRelativeId, familyMembers, addCreatedRelative, nextStep])

  // Generate invitation
  const handleGenerateInvitation = useCallback(
    async (relativeId: number) => {
      if (!user) return
      setGeneratingId(relativeId)
      try {
        const response = await familyApi.generateInvitation(user.id, relativeId)
        setInvitations((prev) => ({ ...prev, [relativeId]: response.invitation_url }))
      } catch {
        toast.error('Не удалось сгенерировать ссылку')
      } finally {
        setGeneratingId(null)
      }
    },
    [user]
  )

  // Complete (guarded to prevent double-fire)
  const handleComplete = useCallback(async () => {
    if (completingRef.current) return
    completingRef.current = true
    completeOnboarding()
    await refreshStats()
    toast.success('Добро пожаловать в GeneticTree!')
  }, [completeOnboarding, refreshStats])

  const familyRelatives = createdRelatives.filter((r) => r.id !== selfRelativeId)

  // Step definitions: 0-3 info, 4-6 functional
  const steps = [
    {
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange to-orange-dark flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
      ),
      title: 'Добро пожаловать!',
      description: 'Как работает GeneticTree',
      content: <WelcomeInfoStep />,
      isInfo: true,
    },
    {
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <TreePine className="w-8 h-8 text-white" />
        </div>
      ),
      title: 'Семейное древо',
      description: 'Два способа построить древо',
      content: <TreeInfoStep />,
      isInfo: true,
    },
    {
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
          <Bot className="w-8 h-8 text-white" />
        </div>
      ),
      title: 'Telegram-бот',
      description: 'Сбор историй через интервью',
      content: <BotInfoStep />,
      isInfo: true,
    },
    {
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
      ),
      title: 'Семейная книга',
      description: 'Все истории — в одной книге',
      content: <BookInfoStep />,
      isInfo: true,
    },
    {
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange to-orange-dark flex items-center justify-center">
          <UserIcon className="w-8 h-8 text-white" />
        </div>
      ),
      title: 'О вас',
      description: 'Расскажите немного о себе',
      content: <AboutYouStep form={selfForm} setForm={setSelfForm} />,
      isInfo: false,
    },
    {
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <Users className="w-8 h-8 text-white" />
        </div>
      ),
      title: 'Ваша семья',
      description: 'Добавьте ближайших родственников',
      content: <YourFamilyStep members={familyMembers} setMembers={setFamilyMembers} />,
      isInfo: false,
    },
    {
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
          <Send className="w-8 h-8 text-white" />
        </div>
      ),
      title: 'Пригласите родных',
      description: 'Отправьте приглашения — бот соберёт воспоминания',
      content: (
        <InviteFamilyStep
          relatives={familyRelatives}
          invitations={invitations}
          onGenerate={handleGenerateInvitation}
          generatingId={generatingId}
        />
      ),
      isInfo: false,
    },
  ]

  const currentStep = steps[step] ?? steps[0]
  const isLastStep = step === TOTAL_STEPS - 1
  const isInfoStep = step < INFO_STEPS_COUNT

  // "About You" step index
  const ABOUT_YOU_STEP = INFO_STEPS_COUNT
  const FAMILY_STEP = INFO_STEPS_COUNT + 1

  const handleNext = useCallback(() => {
    if (isInfoStep) {
      nextStep()
    } else if (step === ABOUT_YOU_STEP) {
      handleAboutYouNext()
    } else if (step === FAMILY_STEP) {
      handleFamilyNext()
    } else {
      handleComplete()
    }
  }, [step, isInfoStep, handleAboutYouNext, handleFamilyNext, handleComplete, nextStep, ABOUT_YOU_STEP, FAMILY_STEP])

  if (!showOnboarding) return null

  return (
    <Dialog open={showOnboarding} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-lg [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (!isLastStep) e.preventDefault()
        }}
      >
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

        <StepIndicator current={step} total={TOTAL_STEPS} />

        <div className="flex items-center justify-between pt-1">
          <div>
            {step > 0 && !isLastStep && (
              <Button variant="ghost" size="sm" onClick={prevStep} disabled={loading}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Назад
              </Button>
            )}
            {isLastStep && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleComplete}
                className="text-muted-foreground"
              >
                Пропустить
              </Button>
            )}
            {step === 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(INFO_STEPS_COUNT)}
                className="text-muted-foreground"
              >
                Пропустить обзор
              </Button>
            )}
          </div>

          <Button
            onClick={handleNext}
            disabled={loading || (step === ABOUT_YOU_STEP && !canProceedAboutYou)}
            className="bg-gradient-to-r from-orange to-orange-dark text-white hover:shadow-glow-orange"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isLastStep ? 'Готово' : 'Далее'}
            {!isLastStep && !loading && <ArrowRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
