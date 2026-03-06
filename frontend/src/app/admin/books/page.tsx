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
import { ChevronLeft, ChevronRight, Trash2, Download, ExternalLink } from 'lucide-react'
import { adminApi, BookGenerationItem, BookGenerationListResponse } from '@/lib/api/admin'
import { toast } from 'sonner'

const STATUS_VARIANTS: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
  completed: 'default',
  generating: 'secondary',
  failed: 'destructive',
}

const STATUS_LABELS: Record<string, string> = {
  completed: 'Готова',
  generating: 'Генерация...',
  failed: 'Ошибка',
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AdminBooksPage() {
  const [data, setData] = useState<BookGenerationListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const limit = 20

  const [userIdFilter, setUserIdFilter] = useState('')
  const [deleteDialog, setDeleteDialog] = useState<BookGenerationItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchBooks = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { skip: page * limit, limit }
      const uid = parseInt(userIdFilter)
      if (!isNaN(uid) && uid > 0) params.user_id = uid

      const result = await adminApi.getBooks(params as Parameters<typeof adminApi.getBooks>[0])
      setData(result)
    } catch {
      toast.error('Не удалось загрузить книги')
    } finally {
      setLoading(false)
    }
  }, [page, userIdFilter])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  const handleDelete = async () => {
    if (!deleteDialog) return
    setDeleting(true)
    try {
      await adminApi.deleteBook(deleteDialog.id)
      toast.success('Книга удалена')
      setDeleteDialog(null)
      fetchBooks()
    } catch {
      toast.error('Не удалось удалить книгу')
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Книги</h1>
        <p className="text-muted-foreground">Сгенерированные семейные книги</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-3">
            <Input
              placeholder="ID пользователя..."
              value={userIdFilter}
              onChange={(e) => { setUserIdFilter(e.target.value); setPage(0) }}
              className="w-40"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !data || data.items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Книги не найдены</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">ID</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Юзер</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Статус</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Файл</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Размер</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Создана</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Завершена</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((book) => (
                      <tr key={book.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-2 px-3 text-muted-foreground">{book.id}</td>
                        <td className="py-2 px-3">{book.user_id || '—'}</td>
                        <td className="py-2 px-3">
                          <Badge variant={STATUS_VARIANTS[book.status] || 'outline'}>
                            {STATUS_LABELS[book.status] || book.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">
                          {book.filename || '—'}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {formatFileSize(book.file_size_bytes)}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">
                          {new Date(book.created_at).toLocaleString('ru-RU')}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">
                          {book.completed_at ? new Date(book.completed_at).toLocaleString('ru-RU') : '—'}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-end gap-1">
                            {book.s3_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Скачать"
                                asChild
                              >
                                <a href={book.s3_url} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Удалить"
                              onClick={() => setDeleteDialog(book)}
                            >
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

      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить книгу?</DialogTitle>
            <DialogDescription>
              Книга #{deleteDialog?.id} будет удалена из S3 и базы данных. Это действие необратимо.
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
