'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  UserCheck,
  UserX,
  GitBranch,
  Link2,
  BookOpen,
  Send,
  Mail,
  Calendar,
  TrendingUp,
} from 'lucide-react'
import { adminApi, AdminDashboardStats, AdminUserListItem, DashboardCharts } from '@/lib/api/admin'
import { toast } from 'sonner'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

function StatsGrid({ stats }: { stats: AdminDashboardStats }) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <StatCard title="Всего пользователей" value={stats.total_users} icon={Users} />
      <StatCard title="Активных" value={stats.active_users} icon={UserCheck} />
      <StatCard title="Заблокированных" value={stats.inactive_users} icon={UserX} />
      <StatCard title="Новых за 7 дней" value={stats.users_registered_last_7_days} icon={Calendar} />
      <StatCard title="Новых за 30 дней" value={stats.users_registered_last_30_days} icon={Calendar} />
      <StatCard title="Родственников" value={stats.total_relatives} icon={GitBranch} />
      <StatCard title="Связей" value={stats.total_relationships} icon={Link2} />
      <StatCard title="Историй" value={stats.total_stories} icon={BookOpen} />
      <StatCard title="Telegram-активаций" value={stats.total_activated_relatives} icon={Send} />
      <StatCard title="Приглашений" value={stats.total_invitations_sent} icon={Mail} />
      <StatCard title="Ср. родственников" value={stats.avg_relatives_per_user} icon={TrendingUp} description="на пользователя" />
    </div>
  )
}

function ChartsSection({ charts }: { charts: DashboardCharts }) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getDate()}.${d.getMonth() + 1}`
  }

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Регистрации за 30 дней</CardTitle>
        </CardHeader>
        <CardContent>
          {charts.registrations_by_day.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Нет данных</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={charts.registrations_by_day}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tickFormatter={formatDate} className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(v) => `Дата: ${v}`} formatter={(v) => [v, 'Регистраций']} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Активные пользователи за 30 дней</CardTitle>
        </CardHeader>
        <CardContent>
          {charts.active_users_by_day.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Нет данных</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={charts.active_users_by_day}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tickFormatter={formatDate} className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(v) => `Дата: ${v}`} formatter={(v) => [v, 'Активных']} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TopUsersTable({ users }: { users: AdminUserListItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Топ пользователей</CardTitle>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет данных</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Пользователь</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Родственников</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Статус</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border/50">
                    <td className="py-2 px-3 font-medium">{user.username}</td>
                    <td className="py-2 px-3 text-muted-foreground">{user.email || '—'}</td>
                    <td className="py-2 px-3 text-right">{user.relatives_count}</td>
                    <td className="py-2 px-3">
                      <Badge variant={user.is_active ? 'default' : 'destructive'}>
                        {user.is_active ? 'Активен' : 'Заблокирован'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 11 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-16" /></CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent><Skeleton className="h-60 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent><Skeleton className="h-60 w-full" /></CardContent></Card>
      </div>
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [charts, setCharts] = useState<DashboardCharts | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, chartsData] = await Promise.all([
          adminApi.getDashboardStats(),
          adminApi.getDashboardCharts(),
        ])
        setStats(statsData)
        setCharts(chartsData)
      } catch {
        toast.error('Не удалось загрузить статистику')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Дашборд</h1>
        <p className="text-muted-foreground">Общая статистика платформы</p>
      </div>

      {loading || !stats ? (
        <DashboardSkeleton />
      ) : (
        <>
          <StatsGrid stats={stats} />
          {charts && <ChartsSection charts={charts} />}
          <TopUsersTable users={stats.top_users} />
        </>
      )}
    </div>
  )
}
