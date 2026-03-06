'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { FamilyRelative, FamilyRelationshipCreate, RelationshipType } from '@/types'
import { RELATIONSHIP_OPTIONS } from '@/components/tree/ConnectionLine'

interface RelationshipFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  relatives: FamilyRelative[]
  preselectedFromId?: number
  onSubmit: (data: FamilyRelationshipCreate) => Promise<void>
}

export default function RelationshipFormDialog({
  open,
  onOpenChange,
  relatives,
  preselectedFromId,
  onSubmit,
}: RelationshipFormDialogProps) {
  const [fromId, setFromId] = useState<number | ''>('')
  const [toId, setToId] = useState<number | ''>('')
  const [type, setType] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setFromId(preselectedFromId || '')
      setToId('')
      setType('')
    }
  }, [open, preselectedFromId])

  const getRelativeName = (r: FamilyRelative) => {
    const parts = [r.first_name, r.last_name].filter(Boolean)
    return parts.join(' ') || `Родственник #${r.id}`
  }

  const handleSubmit = async () => {
    if (!fromId || !toId || !type) {
      toast.error('Заполните все поля')
      return
    }
    if (fromId === toId) {
      toast.error('Нельзя создать связь человека с самим собой')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        from_relative_id: Number(fromId),
        to_relative_id: Number(toId),
        relationship_type: type as RelationshipType,
      })
      onOpenChange(false)
    } catch {
      // error handled by parent
    } finally {
      setSubmitting(false)
    }
  }

  const selectClass =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-sm:max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Добавить связь</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">От кого *</label>
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value === '' ? '' : Number(e.target.value))}
              className={selectClass}
            >
              <option value="">Выберите родственника</option>
              {relatives.map((r) => (
                <option key={r.id} value={r.id}>{getRelativeName(r)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Тип связи *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={selectClass}
            >
              <option value="">Выберите тип связи</option>
              {Object.entries(RELATIONSHIP_OPTIONS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">К кому *</label>
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value === '' ? '' : Number(e.target.value))}
              className={selectClass}
            >
              <option value="">Выберите родственника</option>
              {relatives.map((r) => (
                <option key={r.id} value={r.id}>{getRelativeName(r)}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
