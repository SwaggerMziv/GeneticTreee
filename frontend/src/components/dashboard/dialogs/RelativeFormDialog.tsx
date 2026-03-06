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
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { FamilyRelative, FamilyRelativeCreate, Gender } from '@/types'
import { getProxiedImageUrl } from '@/lib/utils'

const GENDER_LABELS: Record<string, string> = {
  male: 'Мужской',
  female: 'Женский',
  other: 'Другой',
}

const generationOptions: { value: number; label: string }[] = [
  { value: -2, label: 'Внуки' },
  { value: -1, label: 'Дети' },
  { value: 0, label: 'Вы (нынешнее)' },
  { value: 1, label: 'Родители' },
  { value: 2, label: 'Бабушки / Дедушки' },
  { value: 3, label: 'Прабабушки / Прадедушки' },
  { value: 4, label: 'Прапрабабушки / Прапрадедушки' },
  { value: 5, label: 'Пра-пра-прадеды' },
  { value: 6, label: '4× прадеды' },
  { value: 7, label: '5× прадеды' },
]

interface RelativeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'add' | 'edit'
  relative?: FamilyRelative | null
  onSubmit: (data: FamilyRelativeCreate) => Promise<void>
}

export default function RelativeFormDialog({
  open,
  onOpenChange,
  mode,
  relative,
  onSubmit,
}: RelativeFormDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [generation, setGeneration] = useState<number | ''>('')
  const [birthDate, setBirthDate] = useState('')
  const [deathDate, setDeathDate] = useState('')
  const [contactInfo, setContactInfo] = useState('')

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && relative) {
        setFirstName(relative.first_name || '')
        setLastName(relative.last_name || '')
        setMiddleName(relative.middle_name || '')
        setGender(relative.gender || '')
        setGeneration(relative.generation ?? '')
        setBirthDate(relative.birth_date ? relative.birth_date.split('T')[0] : '')
        setDeathDate(relative.death_date ? relative.death_date.split('T')[0] : '')
        setContactInfo(relative.contact_info || '')
        setPhotoUrl(relative.image_url || null)
      } else {
        setFirstName('')
        setLastName('')
        setMiddleName('')
        setGender('')
        setGeneration('')
        setBirthDate('')
        setDeathDate('')
        setContactInfo('')
        setPhotoUrl(null)
      }
    }
  }, [open, mode, relative])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Можно загружать только изображения!')
      return
    }
    if (file.size / 1024 / 1024 > 5) {
      toast.error('Изображение должно быть меньше 5MB!')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${apiUrl}/api/v1/storage/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      setPhotoUrl(data.url)
      toast.success('Фото загружено')
    } catch {
      toast.error('Ошибка загрузки фото')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    if (!firstName.trim()) {
      toast.error('Укажите имя')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        middle_name: middleName.trim() || null,
        gender: (gender as Gender) || undefined,
        generation: generation !== '' ? Number(generation) : undefined,
        birth_date: birthDate || null,
        death_date: deathDate || null,
        contact_info: contactInfo.trim() || null,
        image_url: photoUrl,
      })
      onOpenChange(false)
    } catch {
      // error handled by parent
    } finally {
      setSubmitting(false)
    }
  }

  const proxiedUrl = getProxiedImageUrl(photoUrl)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-sm:max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Добавить родственника' : 'Редактировать'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo upload */}
          <div className="flex items-center gap-4">
            {proxiedUrl ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border shrink-0">
                <Image
                  src={proxiedUrl}
                  alt="Фото"
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center shrink-0">
                <Upload className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Загрузка...' : 'Загрузить фото'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Имя *</label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Имя"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Фамилия</label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Фамилия"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Отчество</label>
            <Input
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              placeholder="Отчество"
            />
          </div>

          {/* Gender & Generation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Пол</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender | '')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Не указан</option>
                {Object.entries(GENDER_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Поколение</label>
              <select
                value={generation}
                onChange={(e) => setGeneration(e.target.value === '' ? '' : Number(e.target.value))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Не указано</option>
                {generationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Дата рождения</label>
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Дата смерти</label>
              <Input
                type="date"
                value={deathDate}
                onChange={(e) => setDeathDate(e.target.value)}
              />
            </div>
          </div>

          {/* Contact */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Контакт</label>
            <Input
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="Телефон, email или соцсети"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Сохранение...' : mode === 'add' ? 'Добавить' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
