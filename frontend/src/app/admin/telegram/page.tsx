'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Send, Mail, MessageSquare, UserCheck, Clock, BookOpen, PenTool } from 'lucide-react'
import { adminApi, AdminTelegramStats } from '@/lib/api/admin'
import { toast } from 'sonner'

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: string | number
  icon: React.ElementType
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

export default function AdminTelegramPage() {
  const [stats, setStats] = useState<AdminTelegramStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminApi.getTelegramStats()
        setStats(data)
      } catch {
        toast.error('Не удалось загрузить статистику Telegram')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Telegram</h1>
          <p className="text-muted-foreground">Статистика Telegram-бота</p>
        </div>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-16" /></CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
          <CardContent><Skeleton className="h-32 w-full" /></CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Telegram</h1>
        <p className="text-muted-foreground">Статистика Telegram-бота</p>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard title="Активированных" value={stats.total_activated} icon={UserCheck} />
        <StatCard title="Приглашений" value={stats.total_invitations_sent} icon={Mail} />
        <StatCard title="С интервью" value={stats.total_with_interviews} icon={MessageSquare} />
        <StatCard title="Ожидают активации" value={stats.total_pending_invitations} icon={Clock} />
        <StatCard title="Историй через бот" value={stats.stories_via_bot} icon={BookOpen} />
        <StatCard title="Историй вручную" value={stats.stories_manually} icon={PenTool} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Активные интервью</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.active_interviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Нет активных интервью</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">ID</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Имя</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Владелец</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Сообщений</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Последняя активность</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.active_interviews.map((interview) => (
                    <tr key={interview.relative_id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-2 px-3 text-muted-foreground">{interview.relative_id}</td>
                      <td className="py-2 px-3 font-medium">{interview.name}</td>
                      <td className="py-2 px-3 text-muted-foreground">{interview.owner_username}</td>
                      <td className="py-2 px-3 text-right">
                        <Badge variant="outline">{interview.messages_count}</Badge>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {interview.last_message_at
                          ? new Date(interview.last_message_at).toLocaleString('ru-RU')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
