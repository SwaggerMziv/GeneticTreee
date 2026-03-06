'use client'

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import { Plus, Search, User, Edit, Trash2, BookOpen, Send, Link2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { useUser } from '@/components/providers/UserProvider'
import { useIsMobile } from '@/hooks/use-mobile'
import { familyApi, relationshipApi } from '@/lib/api/family'
import {
  FamilyRelative,
  FamilyRelationship,
  FamilyRelativeCreate,
  FamilyRelationshipCreate,
  ApiError,
} from '@/types'
import { getErrorMessage, getProxiedImageUrl } from '@/lib/utils'

import RelativeDetailSheet from '@/components/dashboard/RelativeDetailSheet'
import RelativeFormDialog from '@/components/dashboard/dialogs/RelativeFormDialog'
import RelationshipFormDialog from '@/components/dashboard/dialogs/RelationshipFormDialog'
import StoriesDialog from '@/components/dashboard/dialogs/StoriesDialog'
import DeleteConfirmDialog from '@/components/dashboard/dialogs/DeleteConfirmDialog'
import InvitationModal from '@/components/family/InvitationModal'

const GENDER_LABELS: Record<string, string> = {
  male: 'М',
  female: 'Ж',
  other: '?',
}

const generationLabels: Record<number, string> = {
  [-2]: 'Внуки',
  [-1]: 'Дети',
  0: 'Ваше поколение',
  1: 'Родители',
  2: 'Бабушки/Дедушки',
  3: 'Прабабушки',
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

function getStoriesCount(relative: FamilyRelative): number {
  if (!relative.context) return 0
  return Object.keys(relative.context).filter((k) => k !== 'interview_messages').length
}

export default function RelativesPage() {
  const { user, refreshStats } = useUser()
  const isMobile = useIsMobile()

  const [relatives, setRelatives] = useState<FamilyRelative[]>([])
  const [relationships, setRelationships] = useState<FamilyRelationship[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Selection & dialogs
  const [selectedRelative, setSelectedRelative] = useState<FamilyRelative | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [addFormOpen, setAddFormOpen] = useState(false)
  const [editFormOpen, setEditFormOpen] = useState(false)
  const [relationshipFormOpen, setRelationshipFormOpen] = useState(false)
  const [storiesOpen, setStoriesOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteRelOpen, setDeleteRelOpen] = useState(false)
  const [deleteRelId, setDeleteRelId] = useState<number | null>(null)
  const [invitationOpen, setInvitationOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Fetch data
  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      try {
        const [rels, relships] = await Promise.all([
          familyApi.getRelatives(user.id),
          relationshipApi.getRelationships(user.id),
        ])
        setRelatives(rels)
        setRelationships(relships)
      } catch (error) {
        toast.error(getErrorMessage(error as ApiError))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  // Filtered relatives
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return relatives
    const term = searchTerm.toLowerCase()
    return relatives.filter((r) => {
      const name = [r.first_name, r.last_name, r.middle_name].filter(Boolean).join(' ').toLowerCase()
      return name.includes(term)
    })
  }, [relatives, searchTerm])

  // CRUD handlers
  const handleAddRelative = async (data: FamilyRelativeCreate) => {
    if (!user) return
    try {
      const newRel = await familyApi.createRelative(user.id, data)
      setRelatives((prev) => [...prev, newRel])
      toast.success('Родственник добавлен')
      refreshStats()
    } catch (error) {
      toast.error(getErrorMessage(error as ApiError))
      throw error
    }
  }

  const handleEditRelative = async (data: FamilyRelativeCreate) => {
    if (!user || !selectedRelative) return
    try {
      const updated = await familyApi.updateRelative(user.id, selectedRelative.id, data)
      setRelatives((prev) => prev.map((r) => (r.id === updated.id ? { ...updated, context: selectedRelative.context } : r)))
      setSelectedRelative({ ...updated, context: selectedRelative.context })
      toast.success('Данные обновлены')
      refreshStats()
    } catch (error) {
      toast.error(getErrorMessage(error as ApiError))
      throw error
    }
  }

  const handleAddRelationship = async (data: FamilyRelationshipCreate) => {
    if (!user) return
    try {
      const newRel = await relationshipApi.createRelationship(user.id, data)
      setRelationships((prev) => [...prev, newRel])
      toast.success('Связь создана')
      refreshStats()
    } catch (error) {
      toast.error(getErrorMessage(error as ApiError))
      throw error
    }
  }

  const handleDeleteRelationship = (relId: number) => {
    setDeleteRelId(relId)
    setDeleteRelOpen(true)
  }

  const confirmDeleteRelationship = async () => {
    if (!user || !deleteRelId) return
    setDeleting(true)
    try {
      await relationshipApi.deleteRelationship(user.id, deleteRelId)
      setRelationships((prev) => prev.filter((r) => r.id !== deleteRelId))
      toast.success('Связь удалена')
      refreshStats()
    } catch (error) {
      toast.error(getErrorMessage(error as ApiError))
    } finally {
      setDeleting(false)
      setDeleteRelOpen(false)
      setDeleteRelId(null)
    }
  }

  const handleDeleteRelative = () => {
    setDeleteOpen(true)
  }

  const confirmDeleteRelative = async () => {
    if (!user || !selectedRelative) return
    setDeleting(true)
    try {
      await familyApi.deleteRelative(user.id, selectedRelative.id)
      setRelatives((prev) => prev.filter((r) => r.id !== selectedRelative.id))
      setRelationships((prev) =>
        prev.filter((r) => r.from_relative_id !== selectedRelative.id && r.to_relative_id !== selectedRelative.id)
      )
      toast.success('Родственник удалён')
      setDetailOpen(false)
      setSelectedRelative(null)
      refreshStats()
    } catch (error) {
      toast.error(getErrorMessage(error as ApiError))
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  const handleRelativeUpdate = (updated: FamilyRelative) => {
    setRelatives((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    if (selectedRelative?.id === updated.id) setSelectedRelative(updated)
  }

  const openDetail = (rel: FamilyRelative) => {
    setSelectedRelative(rel)
    setDetailOpen(true)
  }

  const relativeName = selectedRelative
    ? [selectedRelative.first_name, selectedRelative.last_name].filter(Boolean).join(' ') || 'Без имени'
    : ''

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-azure border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-bold">Родственники</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {relatives.length} {relatives.length === 1 ? 'человек' : relatives.length < 5 ? 'человека' : 'человек'} в древе
          </p>
        </div>
        <Button onClick={() => setAddFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Поиск по имени..."
          className="pl-10"
        />
      </div>

      {/* Relatives Grid */}
      {filtered.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-10 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-lg font-bold mb-2">
              {searchTerm ? 'Никого не найдено' : 'Нет родственников'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm
                ? 'Попробуйте изменить поисковый запрос'
                : 'Добавьте первого родственника, чтобы начать'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setAddFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Добавить родственника
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((rel) => {
            const proxiedUrl = getProxiedImageUrl(rel.image_url)
            const fullName = [rel.first_name, rel.last_name].filter(Boolean).join(' ') || 'Без имени'
            const age = rel.birth_date ? calculateAge(rel.birth_date, rel.death_date) : null
            const isDeceased = !!rel.death_date
            const stories = getStoriesCount(rel)
            const relCount = relationships.filter(
              (r) => r.from_relative_id === rel.id || r.to_relative_id === rel.id
            ).length

            return (
              <Card
                key={rel.id}
                className="group cursor-pointer hover:border-azure/50 hover:shadow-candy transition-all"
                onClick={() => openDetail(rel)}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  {/* Avatar */}
                  {proxiedUrl ? (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-border shrink-0">
                      <Image src={proxiedUrl} alt={fullName} fill className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">{fullName}</h3>
                      {rel.gender && (
                        <span className="text-xs text-muted-foreground">
                          {GENDER_LABELS[rel.gender]}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {rel.generation !== null && rel.generation !== undefined && (
                        <Badge variant="outline" className="text-[10px] h-5">
                          {generationLabels[rel.generation] || `Пок. ${rel.generation}`}
                        </Badge>
                      )}
                      {isDeceased && (
                        <Badge variant="secondary" className="text-[10px] h-5 bg-muted text-muted-foreground">
                          Ушёл(а)
                        </Badge>
                      )}
                      {rel.is_activated && (
                        <Badge className="text-[10px] h-5 bg-[#0088cc]/10 text-[#0088cc] border-[#0088cc]/20">
                          TG
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {age !== null && <span>{age} лет</span>}
                      {relCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Link2 className="w-3 h-3" />{relCount}
                        </span>
                      )}
                      {stories > 0 && (
                        <span className="flex items-center gap-0.5">
                          <BookOpen className="w-3 h-3" />{stories}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <TooltipProvider delayDuration={300}>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedRelative(rel)
                              setEditFormOpen(true)
                            }}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">Редактировать</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedRelative(rel)
                              setStoriesOpen(true)
                            }}
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">Истории</TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialogs */}
      <RelativeFormDialog
        open={addFormOpen}
        onOpenChange={setAddFormOpen}
        mode="add"
        onSubmit={handleAddRelative}
      />

      <RelativeFormDialog
        open={editFormOpen}
        onOpenChange={setEditFormOpen}
        mode="edit"
        relative={selectedRelative}
        onSubmit={handleEditRelative}
      />

      <RelationshipFormDialog
        open={relationshipFormOpen}
        onOpenChange={setRelationshipFormOpen}
        relatives={relatives}
        preselectedFromId={selectedRelative?.id}
        onSubmit={handleAddRelationship}
      />

      <StoriesDialog
        open={storiesOpen}
        onOpenChange={setStoriesOpen}
        relative={selectedRelative}
        userId={user?.id || 0}
        onRelativeUpdate={handleRelativeUpdate}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Удалить родственника?"
        description="Вы уверены, что хотите удалить этого родственника? Это действие нельзя отменить, и все связи будут разорваны."
        onConfirm={confirmDeleteRelative}
        loading={deleting}
      />

      <DeleteConfirmDialog
        open={deleteRelOpen}
        onOpenChange={setDeleteRelOpen}
        title="Удалить связь?"
        description="Вы уверены, что хотите удалить эту связь?"
        onConfirm={confirmDeleteRelationship}
        loading={deleting}
      />

      <RelativeDetailSheet
        relative={selectedRelative}
        relationships={relationships}
        allRelatives={relatives}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={() => {
          setDetailOpen(false)
          setEditFormOpen(true)
        }}
        onStories={() => {
          setDetailOpen(false)
          setStoriesOpen(true)
        }}
        onAddRelationship={() => {
          setDetailOpen(false)
          setRelationshipFormOpen(true)
        }}
        onDeleteRelationship={handleDeleteRelationship}
        onInvite={() => {
          setDetailOpen(false)
          setInvitationOpen(true)
        }}
        onDelete={handleDeleteRelative}
      />

      {selectedRelative && (
        <InvitationModal
          visible={invitationOpen}
          onClose={() => setInvitationOpen(false)}
          relativeId={selectedRelative.id}
          relativeName={relativeName}
          userId={user?.id || 0}
        />
      )}
    </div>
  )
}
