'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Spin, message, Select, Empty, Input, Modal } from 'antd'
import {
  TreePine,
  ArrowLeft,
  BookOpen,
  User,
  Search,
  Filter,
  Calendar,
} from 'lucide-react'
import { authApi } from '@/lib/api/auth'
import { familyApi } from '@/lib/api/family'
import { User as UserType, ApiError, FamilyRelative } from '@/types'
import { isAuthenticated, getErrorMessage } from '@/lib/utils'

interface Story {
  title: string
  content: string
  relativeName: string
  relativeId: number
}

const StoryCard = ({ story }: { story: Story }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div 
        className="group p-6 rounded-2xl bg-charcoal-900 border border-charcoal-700 hover:border-orange/50 transition-all duration-300 flex flex-col h-full cursor-pointer relative overflow-hidden"
        onClick={() => setIsModalOpen(true)}
      >
        {/* Story Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-orange to-orange-dark">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Story Title */}
        <h3 className="font-serif text-xl font-bold mb-3 text-white line-clamp-2">
          {story.title}
        </h3>

        {/* Story Content Preview */}
        <div className="text-gray-400 mb-2 line-clamp-4 flex-1 relative z-10">
          {story.content}
          {/* Gradient overlay for long text */}
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-charcoal-900 to-transparent pointer-events-none" />
        </div>

        {/* Read More Hint - Absolute positioned with background */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20">
          <div className="bg-charcoal-800 border-t border-charcoal-700 p-3 flex items-center justify-center gap-2 shadow-lg">
            <span className="text-orange text-xs font-bold uppercase tracking-wider">Читать историю</span>
            <BookOpen className="w-3 h-3 text-orange" />
          </div>
        </div>

        {/* Story Author */}
        <div className="flex items-center gap-2 pt-4 border-t border-charcoal-700 mt-auto relative z-10 bg-charcoal-900">
          <User className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-300">{story.relativeName}</span>
        </div>
      </div>

      <Modal
        title={null}
        open={isModalOpen}
        onCancel={(e) => { e.stopPropagation(); setIsModalOpen(false); }}
        footer={null}
        width={700}
        centered
        styles={{
            content: { 
                background: '#111827', 
                padding: 0,
                border: '1px solid #374151',
                borderRadius: '16px',
                overflow: 'hidden'
            },
            mask: { backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.7)' }
        }}
        closeIcon={<span className="text-gray-400 hover:text-white transition-colors">✕</span>}
      >
        <div className="bg-charcoal-900 p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange to-orange-dark">
                    <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                     <h2 className="font-serif text-2xl font-bold text-white leading-tight">{story.title}</h2>
                     <div className="flex items-center gap-2 text-orange text-sm mt-1">
                        <User className="w-3 h-3" />
                        <span>{story.relativeName}</span>
                     </div>
                </div>
            </div>
            
            <div className="prose prose-invert max-w-none">
                <div className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap font-serif">
                    {story.content}
                </div>
            </div>
        </div>
      </Modal>
    </>
  )
}

export default function StoriesPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [relatives, setRelatives] = useState<FamilyRelative[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [filteredStories, setFilteredStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRelative, setSelectedRelative] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth')
      return
    }

    const fetchData = async () => {
      try {
        const userData = await authApi.me()
        setUser(userData)

        const relativesData = await familyApi.getRelatives(userData.id)
        setRelatives(relativesData)

        // Extract stories from relatives' context
        const allStories: Story[] = []
        relativesData.forEach((relative) => {
          if (relative.context && typeof relative.context === 'object') {
            Object.entries(relative.context).forEach(([key, value]) => {
              // Skip interview_messages - they are processed separately
              if (key === 'interview_messages') return

              if (value !== null && value !== undefined) {
                let content = ''

                if (typeof value === 'string') {
                  // Old format: simple string
                  content = value
                } else if (typeof value === 'object' && 'text' in value) {
                  // New format: object with text field
                  content = (value as { text?: string }).text || ''
                } else {
                  // Unknown format - skip
                  return
                }

                if (content.trim()) {
                  allStories.push({
                    title: key,
                    content,
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
            <BookOpen className="w-4 h-4 text-orange" />
            <span className="text-sm text-gray-300 font-medium">
              Семейная лента
            </span>
          </div>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">
            Семейные <span className="gradient-text">истории</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl">
            Истории и воспоминания ваших родственников, собранные в одном месте
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Поиск по историям..."
              prefix={<Search className="w-4 h-4 text-gray-500" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-charcoal-800 border-charcoal-700"
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
              suffixIcon={<Filter className="w-4 h-4 text-gray-500" />}
            />
          </div>
        </div>

        {/* Stories Count */}
        <div className="mb-6 text-gray-400">
          Найдено историй: <span className="text-orange font-bold">{filteredStories.length}</span>
        </div>

        {/* Stories Grid */}
        {filteredStories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Empty
              description={
                <span className="text-gray-400">
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
      </main>
    </div>
  )
}
