'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Select, Input, Modal, Empty } from 'antd'
import {
  BookOpen,
  User,
  Search,
  Filter,
} from 'lucide-react'
import { familyApi } from '@/lib/api/family'
import { FamilyRelative, StoryMedia } from '@/types'
import { getProxiedImageUrl } from '@/lib/utils'
import { Image as ImageIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useUser } from '@/components/providers/UserProvider'
import { toast } from 'sonner'

interface Story {
  title: string
  content: string
  media: StoryMedia[]
  relativeName: string
  relativeId: number
}

const StoryCard = ({ story }: { story: Story }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const photos = story.media?.filter((m) => m.type === 'image') || []

  return (
    <>
      <Card
        className="group cursor-pointer hover:border-orange/50 transition-all duration-300 overflow-hidden"
        onClick={() => setIsModalOpen(true)}
      >
        <CardContent className="p-0">
          {/* Photo preview if available */}
          {photos.length > 0 && (
            <div className="relative aspect-video overflow-hidden">
              <Image
                src={getProxiedImageUrl(photos[0].url) || ''}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
              {photos.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  +{photos.length - 1}
                </div>
              )}
            </div>
          )}

          <div className="p-5 flex flex-col h-full">
            {/* Story Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange to-orange-dark">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              {photos.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ImageIcon className="w-3 h-3" />
                  {photos.length}
                </div>
              )}
            </div>

            {/* Story Title */}
            <h3 className="font-serif text-lg font-bold mb-2 line-clamp-2">
              {story.title}
            </h3>

            {/* Story Content Preview */}
            <div className="text-muted-foreground text-sm mb-3 line-clamp-4 flex-1">
              {story.content}
            </div>

            {/* Story Author */}
            <div className="flex items-center gap-2 pt-3 border-t mt-auto">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{story.relativeName}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        title={null}
        open={isModalOpen}
        onCancel={(e) => { e.stopPropagation(); setIsModalOpen(false); }}
        footer={null}
        width={700}
        centered
        styles={{
          content: {
            background: 'hsl(var(--card))',
            padding: 0,
            border: '1px solid hsl(var(--border))',
            borderRadius: '16px',
            overflow: 'hidden'
          },
          mask: { backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.5)' }
        }}
        closeIcon={<span className="text-muted-foreground hover:text-foreground transition-colors">&times;</span>}
      >
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-br from-orange to-orange-dark">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold leading-tight">{story.title}</h2>
              <div className="flex items-center gap-2 text-orange text-sm mt-1">
                <User className="w-3 h-3" />
                <span>{story.relativeName}</span>
              </div>
            </div>
          </div>

          {/* Photo Gallery */}
          {photos.length > 0 && (
            <div className="mb-6">
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo, idx) => (
                  <div key={idx} className="aspect-square rounded-lg overflow-hidden relative">
                    <Image
                      src={getProxiedImageUrl(photo.url) || ''}
                      alt=""
                      fill
                      className="object-cover hover:scale-105 transition-transform cursor-pointer"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-muted-foreground text-lg leading-relaxed whitespace-pre-wrap font-serif">
            {story.content}
          </div>
        </div>
      </Modal>
    </>
  )
}

export default function StoriesPage() {
  const { user } = useUser()
  const [relatives, setRelatives] = useState<FamilyRelative[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [filteredStories, setFilteredStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRelative, setSelectedRelative] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      try {
        const relativesData = await familyApi.getRelatives(user.id)
        setRelatives(relativesData)

        const allStories: Story[] = []
        relativesData.forEach((relative) => {
          if (relative.context && typeof relative.context === 'object') {
            Object.entries(relative.context).forEach(([key, value]) => {
              if (key === 'interview_messages') return

              if (value !== null && value !== undefined) {
                let content = ''
                let media: StoryMedia[] = []

                if (typeof value === 'string') {
                  content = value
                } else if (typeof value === 'object' && 'text' in value) {
                  content = (value as { text?: string }).text || ''
                  media = (value as { media?: StoryMedia[] }).media || []
                } else {
                  return
                }

                if (content.trim()) {
                  allStories.push({
                    title: key,
                    content,
                    media,
                    relativeName: `${relative.first_name} ${relative.last_name}`,
                    relativeId: relative.id,
                  })
                }
              }
            })
          }
        })
        setStories(allStories)
        setFilteredStories(allStories)
      } catch (error) {
        toast.error('Не удалось загрузить истории')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  useEffect(() => {
    let filtered = stories

    if (selectedRelative) {
      filtered = filtered.filter((story) => story.relativeId === selectedRelative)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (story) =>
          story.title.toLowerCase().includes(term) ||
          story.content.toLowerCase().includes(term) ||
          story.relativeName.toLowerCase().includes(term)
      )
    }

    setFilteredStories(filtered)
  }, [selectedRelative, searchTerm, stories])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border mb-4">
          <BookOpen className="w-4 h-4 text-orange" />
          <span className="text-sm text-muted-foreground font-medium">
            Семейная лента
          </span>
        </div>
        <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">
          Семейные <span className="gradient-text">истории</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Истории и воспоминания ваших родственников, собранные в одном месте
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Поиск по историям..."
            prefix={<Search className="w-4 h-4 text-muted-foreground" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="min-w-[250px]">
          <Select
            placeholder="Фильтр по родственнику"
            allowClear
            className="w-full"
            value={selectedRelative}
            onChange={(value) => setSelectedRelative(value)}
            options={[
              { value: null, label: 'Все родственники' },
              ...relatives.map((r) => ({
                value: r.id,
                label: `${r.first_name} ${r.last_name}`,
              })),
            ]}
            suffixIcon={<Filter className="w-4 h-4 text-muted-foreground" />}
          />
        </div>
      </div>

      {/* Stories Count */}
      <div className="mb-6 text-muted-foreground">
        Найдено историй: <span className="text-orange font-bold">{filteredStories.length}</span>
      </div>

      {/* Stories Grid */}
      {filteredStories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Empty
            description={
              <span className="text-muted-foreground">
                {stories.length === 0
                  ? 'У вас пока нет историй. Добавьте истории через Telegram бота или при создании родственника.'
                  : 'Истории не найдены по заданным фильтрам'}
              </span>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStories.map((story, index) => (
            <StoryCard key={index} story={story} />
          ))}
        </div>
      )}
    </div>
  )
}
