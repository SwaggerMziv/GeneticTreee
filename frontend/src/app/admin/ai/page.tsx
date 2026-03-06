'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight, Cpu, Coins, AlertTriangle, Hash } from 'lucide-react'
import { adminApi, AIUsageStats, AIUsageLogItem, AIUsageLogResponse } from '@/lib/api/admin'
import { toast } from 'sonner'

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  description?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  )
}

const ENDPOINT_LABELS: Record<string, string> = {
  ai_assistant: 'AI Ассистент',
  book: 'Книга',
  tree_generation: 'Генерация дерева',
}

export default function AdminAiPage() {
  const [stats, setStats] = useState<AIUsageStats | null>(null)
  const [usageData, setUsageData] = useState<AIUsageLogResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const limit = 20

  // Filters
  const [userIdFilter, setUserIdFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminApi.getAiStats()
        setStats(data)
      } catch {
        toast.error('Не удалось загрузить статистику AI')
      }
    }
    fetchStats()
  }, [])

  const fetchUsage = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { skip: page * limit, limit }
      const uid = parseInt(userIdFilter)
      if (!isNaN(uid) && uid > 0) params.user_id = uid
      if (typeFilter) params.endpoint_type = typeFilter
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo

      const data = await adminApi.getAiUsage(params as Parameters<typeof adminApi.getAiUsage>[0])
      setUsageData(data)
    } catch {
      toast.error('Не удалось загрузить логи AI')
    } finally {
      setLoading(false)
    }
  }, [page, userIdFilter, typeFilter, dateFrom, dateTo])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value)
    setPage(0)
  }

  const totalPages = usageData ? Math.ceil(usageData.total / limit) : 0
  const formatTokens = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI / Токены</h1>
        <p className="text-muted-foreground">Использование AI и расход токенов</p>
      </div>

      {/* Stats cards */}
      {stats ? (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard title="Всего вызовов" value={stats.total_calls} icon={Hash} />
            <StatCard title="Всего токенов" value={formatTokens(stats.total_tokens)} icon={Cpu}
              description={`prompt: ${formatTokens(stats.total_prompt_tokens)} / completion: ${formatTokens(stats.total_completion_tokens)}`}
            />
            <StatCard title="Стоимость" value={`$${stats.estimated_cost_usd.toFixed(2)}`} icon={Coins} description="приблизительно" />
            <StatCard title="Ошибок" value={stats.errors_count} icon={AlertTriangle} />
          </div>

          {Object.keys(stats.calls_by_type).length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {Object.entries(stats.calls_by_type).map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-sm py-1 px-3">
                  {ENDPOINT_LABELS[type] || type}: {count}
                </Badge>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-16" /></CardContent></Card>
          ))}
        </div>
      )}

      {/* Usage logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Логи использования</CardTitle>
          <div className="flex flex-wrap gap-3 mt-3">
            <Input placeholder="ID юзера..." value={userIdFilter} onChange={(e) => handleFilterChange(setUserIdFilter)(e.target.value)} className="w-32" />
            <select
              value={typeFilter}
              onChange={(e) => handleFilterChange(setTypeFilter)(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Все типы</option>
              <option value="ai_assistant">AI Ассистент</option>
              <option value="book">Книга</option>
              <option value="tree_generation">Генерация дерева</option>
            </select>
            <input type="date" value={dateFrom} onChange={(e) => handleFilterChange(setDateFrom)(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
            <input type="date" value={dateTo} onChange={(e) => handleFilterChange(setDateTo)(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !usageData || usageData.items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Нет данных</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">ID</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Юзер</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Модель</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Тип</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Prompt</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Completion</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Total</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageData.items.map((item) => (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-2 px-3 text-muted-foreground">{item.id}</td>
                        <td className="py-2 px-3">{item.user_id || '—'}</td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">{item.model.split('/').pop()}</td>
                        <td className="py-2 px-3">
                          <Badge variant="outline" className="text-xs">
                            {ENDPOINT_LABELS[item.endpoint_type] || item.endpoint_type}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">{item.prompt_tokens}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{item.completion_tokens}</td>
                        <td className="py-2 px-3 text-right tabular-nums font-medium">{item.total_tokens}</td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">
                          {new Date(item.created_at).toLocaleString('ru-RU')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Показано {usageData.skip + 1}–{Math.min(usageData.skip + usageData.limit, usageData.total)} из {usageData.total}
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
