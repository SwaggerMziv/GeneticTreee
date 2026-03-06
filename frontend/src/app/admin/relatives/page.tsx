'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight, Globe, Send } from 'lucide-react'
import { adminApi, AdminRelativeListItem, AdminAllRelativesResponse } from '@/lib/api/admin'
import { toast } from 'sonner'

export default function AdminRelativesPage() {
  const [data, setData] = useState<AdminAllRelativesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const limit = 20

  // Filters
  const [userIdFilter, setUserIdFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState<string>('')
  const [activatedFilter, setActivatedFilter] = useState<string>('')
  const [storiesFilter, setStoriesFilter] = useState<string>('')

  const fetchRelatives = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = {
        skip: page * limit,
        limit,
      }
      const uid = parseInt(userIdFilter)
      if (!isNaN(uid) && uid > 0) params.user_id = uid
      if (genderFilter) params.gender = genderFilter
      if (activatedFilter === 'yes') params.is_activated = true
      if (activatedFilter === 'no') params.is_activated = false
      if (storiesFilter === 'yes') params.has_stories = true
      if (storiesFilter === 'no') params.has_stories = false

      const result = await adminApi.getAllRelatives(params as Parameters<typeof adminApi.getAllRelatives>[0])
      setData(result)
    } catch {
      toast.error('Не удалось загрузить родственников')
    } finally {
      setLoading(false)
    }
  }, [page, userIdFilter, genderFilter, activatedFilter, storiesFilter])

  useEffect(() => {
    fetchRelatives()
  }, [fetchRelatives])

  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value)
    setPage(0)
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Родственники</h1>
        <p className="text-muted-foreground">Все родственники на платформе</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="ID пользователя..."
              value={userIdFilter}
              onChange={(e) => handleFilterChange(setUserIdFilter)(e.target.value)}
              className="w-40"
            />
            <select
              value={genderFilter}
              onChange={(e) => handleFilterChange(setGenderFilter)(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Все полы</option>
              <option value="male">Мужской</option>
              <option value="female">Женский</option>
              <option value="other">Другой</option>
            </select>
            <select
              value={activatedFilter}
              onChange={(e) => handleFilterChange(setActivatedFilter)(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Telegram: все</option>
              <option value="yes">Подключены</option>
              <option value="no">Не подключены</option>
            </select>
            <select
              value={storiesFilter}
              onChange={(e) => handleFilterChange(setStoriesFilter)(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Истории: все</option>
              <option value="yes">С историями</option>
              <option value="no">Без историй</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data || data.relatives.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Родственники не найдены</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">ID</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Владелец</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Имя</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Пол</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Telegram</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Историй</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Дата</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.relatives.map((rel) => (
                      <tr key={rel.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-2 px-3 text-muted-foreground">{rel.id}</td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {rel.owner_username}
                          <span className="text-xs ml-1 opacity-60">#{rel.user_id}</span>
                        </td>
                        <td className="py-2 px-3 font-medium">
                          {[rel.first_name, rel.last_name].filter(Boolean).join(' ') || '—'}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {rel.gender === 'male' ? 'М' : rel.gender === 'female' ? 'Ж' : '—'}
                        </td>
                        <td className="py-2 px-3">
                          {rel.is_activated ? (
                            <Badge variant="default" className="gap-1">
                              <Send className="h-3 w-3" />
                              Да
                            </Badge>
                          ) : (
                            <Badge variant="outline">Нет</Badge>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">{rel.stories_count}</td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {new Date(rel.created_at).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Открыть дерево"
                              onClick={() => window.open(`/tree?admin_user_id=${rel.user_id}`, '_blank')}
                            >
                              <Globe className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Показано {data.skip + 1}–{Math.min(data.skip + data.limit, data.total)} из {data.total}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />Назад
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                    Вперёд<ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
