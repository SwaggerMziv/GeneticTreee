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
import { Search, ChevronLeft, ChevronRight, Ban, CheckCircle, Trash2, Eye, ShieldCheck, ShieldOff, Globe, KeyRound } from 'lucide-react'
import {
  adminApi,
  AdminUserListItem,
  AdminUserListResponse,
  AdminRelativeListItem,
} from '@/lib/api/admin'
import { usersApi } from '@/lib/api/users'
import { toast } from 'sonner'

type FilterType = 'all' | 'active' | 'blocked'

export default function AdminUsersPage() {
  const [data, setData] = useState<AdminUserListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [page, setPage] = useState(0)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const limit = 20

  // Dialogs
  const [deleteDialog, setDeleteDialog] = useState<AdminUserListItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [relativesDialog, setRelativesDialog] = useState<{ userId: number; username: string } | null>(null)
  const [relatives, setRelatives] = useState<AdminRelativeListItem[]>([])
  const [relativesLoading, setRelativesLoading] = useState(false)

  // Password reset dialog
  const [resetDialog, setResetDialog] = useState<AdminUserListItem | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetting, setResetting] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = {
        skip: page * limit,
        limit,
        sort_by: sortBy,
      }
      if (search.trim()) params.search = search.trim()
      if (filter === 'active') params.only_active = true
      if (filter === 'blocked') params.only_active = false
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo

      const result = await adminApi.getUsers(params as Parameters<typeof adminApi.getUsers>[0])
      setData(result)
    } catch {
      toast.error('Не удалось загрузить пользователей')
    } finally {
      setLoading(false)
    }
  }, [page, search, filter, dateFrom, dateTo, sortBy])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSearch = (value: string) => { setSearch(value); setPage(0) }
  const handleFilter = (f: FilterType) => { setFilter(f); setPage(0) }

  const handleBlock = async (user: AdminUserListItem) => {
    try {
      await usersApi.deactivate(user.id)
      toast.success(`Пользователь ${user.username} заблокирован`)
      fetchUsers()
    } catch { toast.error('Не удалось заблокировать пользователя') }
  }

  const handleUnblock = async (user: AdminUserListItem) => {
    try {
      await usersApi.activate(user.id)
      toast.success(`Пользователь ${user.username} разблокирован`)
      fetchUsers()
    } catch { toast.error('Не удалось разблокировать пользователя') }
  }

  const handleToggleSuperuser = async (user: AdminUserListItem) => {
    try {
      await usersApi.setSuperuser(user.id, !user.is_superuser)
      const action = user.is_superuser ? 'снял права админа' : 'назначил админом'
      toast.success(`${user.username} — ${action}`)
      fetchUsers()
    } catch { toast.error('Не удалось изменить права') }
  }

  const handleDelete = async () => {
    if (!deleteDialog) return
    setDeleting(true)
    try {
      await usersApi.delete(deleteDialog.id)
      toast.success(`Пользователь ${deleteDialog.username} удалён`)
      setDeleteDialog(null)
      fetchUsers()
    } catch { toast.error('Не удалось удалить пользователя') }
    finally { setDeleting(false) }
  }

  const handleViewRelatives = async (userId: number, username: string) => {
    setRelativesDialog({ userId, username })
    setRelativesLoading(true)
    try {
      const data = await adminApi.getUserRelatives(userId)
      setRelatives(data)
    } catch { toast.error('Не удалось загрузить родственников') }
    finally { setRelativesLoading(false) }
  }

  const handleResetPassword = async () => {
    if (!resetDialog || !newPassword.trim()) return
    if (newPassword.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов')
      return
    }
    setResetting(true)
    try {
      await adminApi.resetUserPassword(resetDialog.id, newPassword)
      toast.success(`Пароль пользователя ${resetDialog.username} сброшен`)
      setResetDialog(null)
      setNewPassword('')
    } catch { toast.error('Не удалось сбросить пароль') }
    finally { setResetting(false) }
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Пользователи</h1>
        <p className="text-muted-foreground">Управление пользователями платформы</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Поиск по имени или email..." value={search} onChange={(e) => handleSearch(e.target.value)} className="pl-10" />
              </div>
              <div className="flex gap-2">
                {(['all', 'active', 'blocked'] as FilterType[]).map((f) => (
                  <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => handleFilter(f)}>
                    {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Заблокированные'}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">С:</span>
                <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0) }}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">По:</span>
                <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0) }}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
              </div>
              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(0) }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="created_at">По дате</option>
                <option value="relatives_count">По размеру дерева</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !data || data.users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Пользователи не найдены</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">ID</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Имя</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Email</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Дата</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Родств.</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Историй</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Статус</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((user) => (
                      <tr key={user.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-2 px-3 text-muted-foreground">{user.id}</td>
                        <td className="py-2 px-3 font-medium">
                          {user.username}
                          {user.is_superuser && <Badge variant="outline" className="ml-2 text-xs">admin</Badge>}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{user.email || '—'}</td>
                        <td className="py-2 px-3 text-muted-foreground">{new Date(user.created_at).toLocaleDateString('ru-RU')}</td>
                        <td className="py-2 px-3 text-right">{user.relatives_count}</td>
                        <td className="py-2 px-3 text-right">{user.stories_count}</td>
                        <td className="py-2 px-3">
                          <Badge variant={user.is_active ? 'default' : 'destructive'}>
                            {user.is_active ? 'Активен' : 'Заблокирован'}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Родственники"
                              onClick={() => handleViewRelatives(user.id, user.username)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Дерево"
                              onClick={() => window.open(`/tree?admin_user_id=${user.id}`, '_blank')}>
                              <Globe className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600" title="Сбросить пароль"
                              onClick={() => { setResetDialog(user); setNewPassword('') }}>
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon"
                              className={`h-8 w-8 ${user.is_superuser ? 'text-amber-500 hover:text-amber-600' : 'text-blue-500 hover:text-blue-600'}`}
                              title={user.is_superuser ? 'Снять права админа' : 'Назначить админом'}
                              onClick={() => handleToggleSuperuser(user)}>
                              {user.is_superuser ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                            </Button>
                            {user.is_active ? (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-500 hover:text-orange-600"
                                title="Заблокировать" onClick={() => handleBlock(user)}>
                                <Ban className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500 hover:text-green-600"
                                title="Разблокировать" onClick={() => handleUnblock(user)}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Удалить" onClick={() => setDeleteDialog(user)}>
                              <Trash2 className="h-4 w-4" />
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

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить пользователя?</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить пользователя <strong>{deleteDialog?.username}</strong>?
              Это действие необратимо. Все данные пользователя будут удалены.
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

      {/* Password reset dialog */}
      <Dialog open={!!resetDialog} onOpenChange={() => setResetDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сбросить пароль</DialogTitle>
            <DialogDescription>
              Установить новый пароль для пользователя <strong>{resetDialog?.username}</strong>
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            placeholder="Новый пароль (мин. 6 символов)..."
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialog(null)}>Отмена</Button>
            <Button onClick={handleResetPassword} disabled={resetting || newPassword.length < 6}>
              {resetting ? 'Сброс...' : 'Сбросить пароль'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Relatives dialog */}
      <Dialog open={!!relativesDialog} onOpenChange={() => setRelativesDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Родственники — {relativesDialog?.username}</DialogTitle>
          </DialogHeader>
          {relativesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : relatives.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Нет родственников</p>
          ) : (
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">ID</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Имя</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Пол</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Telegram</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Историй</th>
                  </tr>
                </thead>
                <tbody>
                  {relatives.map((rel) => (
                    <tr key={rel.id} className="border-b border-border/50">
                      <td className="py-2 px-3 text-muted-foreground">{rel.id}</td>
                      <td className="py-2 px-3 font-medium">{[rel.first_name, rel.last_name].filter(Boolean).join(' ') || '—'}</td>
                      <td className="py-2 px-3 text-muted-foreground">{rel.gender === 'male' ? 'М' : rel.gender === 'female' ? 'Ж' : '—'}</td>
                      <td className="py-2 px-3">
                        {rel.is_activated ? <Badge variant="default">Подключён</Badge> : <Badge variant="outline">Нет</Badge>}
                      </td>
                      <td className="py-2 px-3 text-right">{rel.stories_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
