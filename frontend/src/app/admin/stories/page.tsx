'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Trash2, ImageIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { adminApi, AdminStoryItem } from '@/lib/api/admin'
import { getProxiedImageUrl } from '@/lib/utils'
import { toast } from 'sonner'

export default function AdminStoriesPage() {
  const [stories, setStories] = useState<AdminStoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userIdFilter, setUserIdFilter] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const limit = 20

  // Expanded rows
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState<AdminStoryItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchStories = useCallback(async () => {
    setLoading(true)
    try {
      const params: { skip: number; limit: number; user_id?: number } = {
        skip: page * limit,
        limit,
      }
      const uid = parseInt(userIdFilter)
      if (!isNaN(uid) && uid > 0) params.user_id = uid

      const data = await adminApi.getStories(params)
      setStories(data)
      setHasMore(data.length === limit)
    } catch {
      toast.error('Не удалось загрузить истории')
    } finally {
      setLoading(false)
    }
  }, [page, userIdFilter])

  useEffect(() => {
    fetchStories()
  }, [fetchStories])

  const handleFilterChange = (value: string) => {
    setUserIdFilter(value)
    setPage(0)
  }

  const handleDelete = async () => {
    if (!deleteDialog) return
    setDeleting(true)
    try {
      await adminApi.deleteStory(deleteDialog.relative_id, deleteDialog.story_key)
      toast.success('История удалена')
      setDeleteDialog(null)
      fetchStories()
    } catch {
      toast.error('Не удалось удалить историю')
    } finally {
      setDeleting(false)
    }
  }

  const toggleExpand = (storyId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(storyId)) next.delete(storyId)
      else next.add(storyId)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Истории</h1>
        <p className="text-muted-foreground">Модерация историй пользователей</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Фильтр по ID пользователя..."
              value={userIdFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : stories.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Истории не найдены</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="w-8"></th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Родственник</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Владелец</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Заголовок</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground max-w-xs">Текст</th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">Медиа</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Дата</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stories.map((story, idx) => {
                      const storyId = `${story.relative_id}-${story.story_key}-${idx}`
                      const isExpanded = expandedIds.has(storyId)

                      return (
                        <>
                          <tr key={storyId} className="border-b border-border/50 hover:bg-muted/50 cursor-pointer"
                            onClick={() => toggleExpand(storyId)}>
                            <td className="py-2 px-1 text-center">
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                            </td>
                            <td className="py-2 px-3 font-medium">{story.relative_name}</td>
                            <td className="py-2 px-3 text-muted-foreground">{story.owner_username}</td>
                            <td className="py-2 px-3">{story.story_key}</td>
                            <td className="py-2 px-3 text-muted-foreground max-w-xs truncate">{story.story_text || '—'}</td>
                            <td className="py-2 px-3 text-center">
                              {story.media_count > 0 ? (
                                <Badge variant="outline" className="gap-1">
                                  <ImageIcon className="h-3 w-3" />{story.media_count}
                                </Badge>
                              ) : '—'}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">
                              {story.created_at ? new Date(story.created_at).toLocaleDateString('ru-RU') : '—'}
                            </td>
                            <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                  title="Удалить" onClick={() => setDeleteDialog(story)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${storyId}-expanded`} className="border-b border-border/50">
                              <td colSpan={8} className="py-3 px-6 bg-muted/30">
                                <div className="space-y-3">
                                  <p className="text-sm whitespace-pre-wrap">{story.story_text}</p>
                                  {story.media_urls && story.media_urls.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {story.media_urls.map((url, i) => (
                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                          className="block w-20 h-20 rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity">
                                          <img src={getProxiedImageUrl(url) || undefined} alt={`Медиа ${i + 1}`}
                                            className="w-full h-full object-cover" />
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">Страница {page + 1}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />Назад
                  </Button>
                  <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>
                    Вперёд<ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить историю?</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить историю &quot;{deleteDialog?.story_key}&quot;
              родственника {deleteDialog?.relative_name}? Это действие необратимо.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Отмена</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Удаление...' : 'Удалить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
