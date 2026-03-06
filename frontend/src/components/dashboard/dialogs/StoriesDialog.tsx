'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft, BookOpen, Plus, Trash2, Upload, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { FamilyRelative, StoryMedia, ApiError } from '@/types'
import { familyApi, storiesApi } from '@/lib/api/family'
import { getErrorMessage, getProxiedImageUrl } from '@/lib/utils'

interface StoryItem {
  key: string
  value: string
  media?: StoryMedia[]
}

interface StoriesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  relative: FamilyRelative | null
  userId: number
  onRelativeUpdate: (relative: FamilyRelative) => void
}

export default function StoriesDialog({
  open,
  onOpenChange,
  relative,
  userId,
  onRelativeUpdate,
}: StoriesDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stories, setStories] = useState<StoryItem[]>([])
  const [viewingStory, setViewingStory] = useState<StoryItem | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newText, setNewText] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  useEffect(() => {
    if (open && relative) {
      const contextObj = relative.context || {}
      const arr = Object.entries(contextObj)
        .filter(([key]) => key !== 'interview_messages')
        .map(([key, value]) => {
          if (typeof value === 'object' && value !== null && 'text' in value) {
            return {
              key,
              value: (value as { text?: string }).text || '',
              media: (value as { media?: StoryMedia[] }).media || [],
            }
          }
          return { key, value: String(value), media: [] }
        })
      setStories(arr)
      setViewingStory(null)
      setNewTitle('')
      setNewText('')
    }
  }, [open, relative])

  const updateRelativeContext = (updatedContext: Record<string, unknown>) => {
    if (!relative) return
    const updated = { ...relative, context: updatedContext }
    onRelativeUpdate(updated)
  }

  const handleAddStory = async () => {
    if (!relative || !newTitle.trim() || !newText.trim()) {
      toast.error('Заполните название и текст истории')
      return
    }

    try {
      await familyApi.updateContext(userId, relative.id, newTitle.trim(), newText.trim())
      const newStory = { key: newTitle.trim(), value: newText.trim(), media: [] }
      setStories((prev) => [...prev, newStory])
      const updatedContext = { ...(relative.context || {}), [newTitle.trim()]: newText.trim() }
      updateRelativeContext(updatedContext)
      setNewTitle('')
      setNewText('')
      toast.success('История добавлена')
    } catch (error) {
      toast.error(getErrorMessage(error as ApiError))
    }
  }

  const handleRemoveStory = async (keyToRemove: string) => {
    if (!relative) return

    try {
      const updatedContext = { ...(relative.context || {}) }
      delete updatedContext[keyToRemove]
      await familyApi.updateRelative(userId, relative.id, { context: updatedContext })
      setStories((prev) => prev.filter((s) => s.key !== keyToRemove))
      if (viewingStory?.key === keyToRemove) setViewingStory(null)
      updateRelativeContext(updatedContext)
      toast.success('История удалена')
    } catch (error) {
      toast.error(getErrorMessage(error as ApiError))
    }
  }

  const handleUploadPhoto = async (file: File, storyKey: string) => {
    if (!relative) return

    setUploadingPhoto(true)
    try {
      const response = await storiesApi.uploadMedia(userId, relative.id, storyKey, file)
      setStories((prev) =>
        prev.map((s) =>
          s.key === storyKey
            ? { ...s, media: [...(s.media || []), response.media] }
            : s
        )
      )
      if (viewingStory?.key === storyKey) {
        setViewingStory((prev) =>
          prev ? { ...prev, media: [...(prev.media || []), response.media] } : prev
        )
      }
      const updatedContext = { ...(relative.context || {}) }
      const storyData = updatedContext[storyKey]
      if (typeof storyData === 'object' && storyData !== null) {
        (storyData as { media?: StoryMedia[] }).media = [
          ...((storyData as { media?: StoryMedia[] }).media || []),
          response.media,
        ]
      }
      updateRelativeContext(updatedContext)
      toast.success('Фото загружено')
    } catch (error) {
      toast.error(getErrorMessage(error as ApiError))
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeletePhoto = async (storyKey: string, mediaUrl: string) => {
    if (!relative) return

    try {
      await storiesApi.deleteMedia(userId, relative.id, storyKey, mediaUrl)
      setStories((prev) =>
        prev.map((s) =>
          s.key === storyKey
            ? { ...s, media: (s.media || []).filter((m) => m.url !== mediaUrl) }
            : s
        )
      )
      if (viewingStory?.key === storyKey) {
        setViewingStory((prev) =>
          prev ? { ...prev, media: (prev.media || []).filter((m) => m.url !== mediaUrl) } : prev
        )
      }
      const updatedContext = { ...(relative.context || {}) }
      const storyData = updatedContext[storyKey]
      if (typeof storyData === 'object' && storyData !== null) {
        (storyData as { media?: StoryMedia[] }).media = (
          (storyData as { media?: StoryMedia[] }).media || []
        ).filter((m) => m.url !== mediaUrl)
      }
      updateRelativeContext(updatedContext)
      toast.success('Фото удалено')
    } catch (error) {
      toast.error(getErrorMessage(error as ApiError))
    }
  }

  const relativeName = relative
    ? [relative.first_name, relative.last_name].filter(Boolean).join(' ')
    : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-sm:max-w-[95vw] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {viewingStory && (
              <button onClick={() => setViewingStory(null)} className="hover:text-azure transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <BookOpen className="w-5 h-5" />
            {viewingStory ? viewingStory.key : `Истории — ${relativeName}`}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {!viewingStory ? (
            /* List view */
            <div className="space-y-4 pb-4">
              {stories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Нет историй. Добавьте первую!
                </p>
              )}

              {stories.map((story) => (
                <div
                  key={story.key}
                  className="group flex items-center gap-3 p-3 rounded-lg border border-border hover:border-azure/30 cursor-pointer transition-colors"
                  onClick={() => setViewingStory(story)}
                >
                  <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{story.key}</div>
                    <div className="text-xs text-muted-foreground truncate">{story.value}</div>
                    {story.media && story.media.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <ImageIcon className="w-3 h-3" />
                        {story.media.length} фото
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 shrink-0 h-8 w-8 text-red-500 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveStory(story.key)
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <Separator />

              {/* Add new story form */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Новая история
                </h4>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Название истории"
                />
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Текст истории..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
                <Button
                  onClick={handleAddStory}
                  size="sm"
                  disabled={!newTitle.trim() || !newText.trim()}
                >
                  Добавить историю
                </Button>
              </div>
            </div>
          ) : (
            /* Detail view */
            <div className="space-y-4 pb-4">
              <p className="text-sm whitespace-pre-wrap">{viewingStory.value}</p>

              <Separator />

              {/* Photos grid */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Фотографии ({viewingStory.media?.length || 0}/5)
                </h4>

                {viewingStory.media && viewingStory.media.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {viewingStory.media.map((m, idx) => {
                      const proxied = getProxiedImageUrl(m.url)
                      return (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border group/photo">
                          {proxied && (
                            <Image
                              src={proxied}
                              alt=""
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          )}
                          <button
                            onClick={() => handleDeletePhoto(viewingStory.key, m.url)}
                            className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Нет фотографий</p>
                )}

                {(!viewingStory.media || viewingStory.media.length < 5) && (
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingPhoto ? 'Загрузка...' : 'Загрузить фото'}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file && viewingStory) handleUploadPhoto(file, viewingStory.key)
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
