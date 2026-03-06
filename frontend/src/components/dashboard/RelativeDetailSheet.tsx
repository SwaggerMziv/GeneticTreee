'use client'

import Image from 'next/image'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Edit,
  Trash2,
  BookOpen,
  Link2,
  Send,
  User,
} from 'lucide-react'
import { FamilyRelative, FamilyRelationship } from '@/types'
import { RELATIONSHIP_LABELS } from '@/components/tree/ConnectionLine'
import { getProxiedImageUrl } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

const GENDER_LABELS: Record<string, string> = {
  male: 'Мужской',
  female: 'Женский',
  other: 'Другой',
}

const generationLabels: Record<number, string> = {
  [-2]: 'Внуки',
  [-1]: 'Дети',
  0: 'Ваше поколение',
  1: 'Родители',
  2: 'Бабушки / Дедушки',
  3: 'Прабабушки / Прадедушки',
  4: 'Прапрабабушки',
  5: 'Пра-пра-прадеды',
  6: '4× прадеды',
  7: '5× прадеды',
}

function calculateAge(birthDate: string, deathDate?: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const end = deathDate ? new Date(deathDate) : new Date()
  let age = end.getFullYear() - birth.getFullYear()
  const monthDiff = end.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) age--
  return age
}

function formatDateRu(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getStoriesCount(relative: FamilyRelative): number {
  if (!relative.context) return 0
  return Object.keys(relative.context).filter((k) => k !== 'interview_messages').length
}

interface RelativeDetailSheetProps {
  relative: FamilyRelative | null
  relationships: FamilyRelationship[]
  allRelatives: FamilyRelative[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  onStories: () => void
  onAddRelationship: () => void
  onDeleteRelationship: (id: number) => void
  onInvite: () => void
  onDelete: () => void
}

export default function RelativeDetailSheet({
  relative,
  relationships,
  allRelatives,
  open,
  onOpenChange,
  onEdit,
  onStories,
  onAddRelationship,
  onDeleteRelationship,
  onInvite,
  onDelete,
}: RelativeDetailSheetProps) {
  const isMobile = useIsMobile()

  if (!relative) return null

  const fullName = [relative.first_name, relative.middle_name, relative.last_name]
    .filter(Boolean)
    .join(' ')
  const proxiedUrl = getProxiedImageUrl(relative.image_url)
  const age = relative.birth_date ? calculateAge(relative.birth_date, relative.death_date) : null
  const isDeceased = !!relative.death_date
  const storiesCount = getStoriesCount(relative)

  // Relationships involving this relative
  const relatedRels = relationships.filter(
    (r) => r.from_relative_id === relative.id || r.to_relative_id === relative.id
  )

  const getRelativeName = (id: number) => {
    const r = allRelatives.find((rel) => rel.id === id)
    if (!r) return `#${id}`
    return [r.first_name, r.last_name].filter(Boolean).join(' ') || `#${id}`
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={isMobile ? 'h-[80vh] rounded-t-2xl' : 'w-[420px] sm:w-[460px]'}
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left">{fullName || 'Без имени'}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100%-4rem)] -mx-6 px-6">
          <div className="space-y-5 pb-6">
            {/* Avatar & Basic Info */}
            <div className="flex items-start gap-4">
              {proxiedUrl ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border shrink-0">
                  <Image src={proxiedUrl} alt={fullName} fill className="object-cover" unoptimized />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-1.5">
                {relative.gender && (
                  <Badge variant="secondary" className="text-xs">
                    {GENDER_LABELS[relative.gender] || relative.gender}
                  </Badge>
                )}
                {relative.generation !== null && relative.generation !== undefined && (
                  <Badge variant="outline" className="text-xs ml-1">
                    {generationLabels[relative.generation] || `Поколение ${relative.generation}`}
                  </Badge>
                )}
                {isDeceased && (
                  <Badge variant="secondary" className="text-xs ml-1 bg-muted text-muted-foreground">
                    Ушёл(а)
                  </Badge>
                )}
                {relative.is_activated && (
                  <Badge className="text-xs ml-1 bg-[#0088cc]/10 text-[#0088cc] border-[#0088cc]/20">
                    Telegram
                  </Badge>
                )}
                {age !== null && (
                  <p className="text-sm text-muted-foreground">
                    {isDeceased ? `Прожил(а) ${age} лет` : `${age} лет`}
                  </p>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2 text-sm">
              {relative.birth_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Дата рождения</span>
                  <span>{formatDateRu(relative.birth_date)}</span>
                </div>
              )}
              {relative.death_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Дата смерти</span>
                  <span>{formatDateRu(relative.death_date)}</span>
                </div>
              )}
              {relative.contact_info && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Контакт</span>
                  <span className="text-right max-w-[60%] truncate">{relative.contact_info}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Relationships */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Связи ({relatedRels.length})</h4>
                <Button variant="outline" size="sm" onClick={onAddRelationship} className="h-7 text-xs">
                  <Link2 className="w-3 h-3 mr-1" />
                  Добавить
                </Button>
              </div>
              {relatedRels.length === 0 ? (
                <p className="text-xs text-muted-foreground">Нет связей</p>
              ) : (
                <div className="space-y-2">
                  {relatedRels.map((rel) => {
                    const isFrom = rel.from_relative_id === relative.id
                    const otherId = isFrom ? rel.to_relative_id : rel.from_relative_id
                    const label = RELATIONSHIP_LABELS[rel.relationship_type] || rel.relationship_type
                    return (
                      <div
                        key={rel.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="mx-1.5">→</span>
                          <span className="font-medium">{getRelativeName(otherId)}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600 shrink-0"
                          onClick={() => onDeleteRelationship(rel.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={onEdit} className="h-9">
                <Edit className="w-4 h-4 mr-2" />
                Редактировать
              </Button>
              <Button variant="outline" onClick={onStories} className="h-9">
                <BookOpen className="w-4 h-4 mr-2" />
                Истории{storiesCount > 0 && ` (${storiesCount})`}
              </Button>
              {!relative.is_activated && (
                <Button variant="outline" onClick={onInvite} className="h-9">
                  <Send className="w-4 h-4 mr-2" />
                  Пригласить
                </Button>
              )}
              <Button
                variant="outline"
                onClick={onDelete}
                className="h-9 text-red-500 hover:text-red-600 hover:border-red-300"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
