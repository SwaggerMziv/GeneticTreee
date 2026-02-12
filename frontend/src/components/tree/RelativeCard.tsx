'use client'

import { FamilyRelative } from '@/types'
import { Heart, BookOpen } from 'lucide-react'
import { getProxiedImageUrl } from '@/lib/utils'
import Image from 'next/image'

// Warm pastel palette for card styling - soft and elegant
const GENDER_COLORS: Record<string, {
  // Light theme
  lightBg: string; lightBorder: string; lightAccent: string; lightGradient: string
  // Dark theme
  darkBg: string; darkBorder: string; darkGradient: string
  // Shared
  accent: string
}> = {
  male: {
    lightBg: 'bg-gradient-to-b from-[#DCE9F8] to-[#C2D8F0]',
    lightBorder: 'border-[#88B0D8]/60',
    lightAccent: 'bg-[#5A94C4]',
    lightGradient: 'from-[#88B0D8]/35',
    darkBg: 'dark:bg-gradient-to-b dark:from-[#1e2a38] dark:to-[#182230]',
    darkBorder: 'dark:border-[#6A9DC4]/35',
    darkGradient: 'dark:from-[#6A9DC4]/15',
    accent: 'bg-[#7BAec8]',
  },
  female: {
    lightBg: 'bg-gradient-to-b from-[#FCDCE6] to-[#F5C2D2]',
    lightBorder: 'border-[#E8899E]/60',
    lightAccent: 'bg-[#D4607E]',
    lightGradient: 'from-[#E8899E]/35',
    darkBg: 'dark:bg-gradient-to-b dark:from-[#3a1e2a] dark:to-[#2c1822]',
    darkBorder: 'dark:border-[#D4607E]/45',
    darkGradient: 'dark:from-[#D4607E]/20',
    accent: 'bg-[#D4607E]',
  },
  other: {
    lightBg: 'bg-gradient-to-b from-amber-50/90 to-stone-50/70',
    lightBorder: 'border-amber-200/80',
    lightAccent: 'bg-amber-400',
    lightGradient: 'from-amber-200/40',
    darkBg: 'dark:bg-gradient-to-b dark:from-[#2a2520] dark:to-[#1e1b2e]',
    darkBorder: 'dark:border-[#FFBB70]/45',
    darkGradient: 'dark:from-[#FFBB70]/20',
    accent: 'bg-[#FFBB70]',
  },
}

interface RelativeCardProps {
  relative: FamilyRelative
  isSelected?: boolean
  onClick?: () => void
  size?: 'small' | 'medium' | 'large'
}

function calculateAge(birthDate: string, deathDate?: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const end = deathDate ? new Date(deathDate) : new Date()
  let age = end.getFullYear() - birth.getFullYear()
  const monthDiff = end.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
    age--
  }
  return age
}

function formatYear(dateString: string): string {
  return new Date(dateString).getFullYear().toString()
}

export default function RelativeCard({ relative, isSelected, onClick, size = 'medium' }: RelativeCardProps) {
  const colors = GENDER_COLORS[relative.gender || 'other']
  const age = relative.birth_date ? calculateAge(relative.birth_date, relative.death_date) : null
  const isDeceased = !!relative.death_date
  const hasStories = relative.context && Object.keys(relative.context).length > 0
  const generationLabel = relative.generation ?? '—'
  const middleName = relative.middle_name?.trim()
  const genderLabel =
    relative.gender === 'male' ? 'мужской' : relative.gender === 'female' ? 'женский' : relative.gender ? 'другой' : ''

  const sizeClasses = {
    small: 'w-44 min-h-[240px] h-[240px]',
    medium: 'w-52 min-h-[280px] h-[280px]',
    large: 'w-64 min-h-[312px] h-[312px]',
  }

  const photoSizes = {
    small: 'w-[104px] h-[104px]',
    medium: 'w-[124px] h-[124px]',
    large: 'w-[138px] h-[138px]',
  }

  return (
    <div
      onClick={onClick}
      className={`
        ${sizeClasses[size]}
        ${colors.lightBg} ${colors.darkBg}
        ${isSelected ? 'ring-2 ring-[#ED7855] ring-offset-2 ring-offset-background scale-105' : ''}
        ${isDeceased ? 'opacity-85' : ''}
        relative rounded-2xl border ${colors.lightBorder} ${colors.darkBorder} backdrop-blur-sm cursor-pointer
        transition-all duration-300 hover:scale-[1.04] hover:shadow-lg hover:shadow-[#ED7855]/10 dark:hover:shadow-[#ED7855]/15
        flex flex-col items-center overflow-hidden group pb-3
        shadow-sm
      `}
    >
      {/* Top decorative header */}
      <div className={`absolute top-0 left-0 right-0 h-16 bg-gradient-to-b ${colors.lightGradient} ${colors.darkGradient} to-transparent pointer-events-none`} />

      {/* Ornamental corner decorations */}
      <svg className="absolute top-1.5 left-1.5 w-3 h-3 text-foreground/8" viewBox="0 0 20 20">
        <path d="M0 0 L8 0 L0 8 Z" fill="currentColor" />
      </svg>
      <svg className="absolute top-1.5 right-1.5 w-3 h-3 text-foreground/8" viewBox="0 0 20 20">
        <path d="M20 0 L12 0 L20 8 Z" fill="currentColor" />
      </svg>

      {/* Generation / gender / stories badges */}
      <div className="absolute top-2 left-8 right-2 z-20 flex items-center justify-between gap-1 pointer-events-none">
        <div className="flex items-center gap-1 pointer-events-none">
          <div className="px-1.5 py-0.5 rounded-md bg-[#63465A]/70 dark:bg-[#63465A]/80 text-[9px] font-semibold text-white shadow-sm whitespace-nowrap">
            Пок. {generationLabel}
          </div>
          {genderLabel && (
            <div className="px-1.5 py-0.5 rounded-md bg-foreground/5 dark:bg-white/8 border border-foreground/8 dark:border-white/10 text-[9px] uppercase tracking-wide text-foreground/70 dark:text-white/70 whitespace-nowrap">
              {genderLabel}
            </div>
          )}
        </div>
        {hasStories && (
          <div className="w-5 h-5 rounded-md bg-[#FFA477]/90 flex items-center justify-center shadow-sm pointer-events-auto">
            <BookOpen className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Deceased ribbon */}
      {isDeceased && (
        <div className="absolute top-3 -left-8 z-10 rotate-[-45deg]">
          <div className="bg-[#63465A]/80 text-white text-[8px] font-medium px-8 py-0.5 shadow-md">
            В ПАМЯТИ
          </div>
        </div>
      )}

      {/* Photo / Avatar with frame */}
      <div className="relative mt-8 z-10">
        <div className={`absolute -inset-1 rounded-xl ${colors.accent} opacity-15 dark:opacity-20 blur-sm`} />
        <div className={`absolute -inset-0.5 rounded-xl border ${colors.lightBorder} ${colors.darkBorder}`} />
        <div className={`${photoSizes[size]} rounded-xl overflow-hidden bg-muted dark:bg-[#2a2640] relative`}>
          {relative.image_url ? (
            <Image
              src={getProxiedImageUrl(relative.image_url) || ''}
              alt={relative.first_name || 'Родственник'}
              fill
              className={`object-cover ${isDeceased ? 'grayscale' : ''}`}
              unoptimized
            />
          ) : (
            <div className={`w-full h-full ${colors.accent} flex items-center justify-center`}>
              <span className="text-2xl font-serif font-bold text-white/90 drop-shadow">
                {relative.first_name?.charAt(0) || relative.last_name?.charAt(0) || '?'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Name with decorative underline */}
      <div className="mt-3 text-center w-full px-3 z-20">
        <p className="font-serif font-bold text-foreground text-sm truncate leading-tight">
          {relative.first_name || relative.last_name
            ? `${relative.first_name || ''} ${relative.last_name || ''}`.trim()
            : <span className="text-muted-foreground italic">Без имени</span>
          }
        </p>
        {middleName && (
          <p className="text-muted-foreground text-[11px] truncate leading-tight">
            {middleName}
          </p>
        )}
        <div className="mx-auto mt-1.5 w-12 h-px bg-gradient-to-r from-transparent via-[#ED7855]/30 to-transparent pointer-events-none" />
      </div>

      {/* Age badge */}
      <div className="mt-2 flex flex-col items-center text-center z-20 gap-1 px-4 w-full">
        {age !== null && (
          <div className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1
            ${isDeceased
              ? 'bg-[#63465A]/10 dark:bg-[#63465A]/30 text-[#63465A] dark:text-[#AC6D78] border border-[#63465A]/20 dark:border-[#63465A]/40'
              : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/30'
            }`}
          >
            {!isDeceased && <Heart className="w-3 h-3" />}
            {age} лет
          </div>
        )}
        <div className="text-[10px] text-muted-foreground flex flex-wrap justify-center gap-x-1 leading-tight">
          {relative.birth_date && <span>р. {formatYear(relative.birth_date)}</span>}
          {relative.death_date && <span>✝ {formatYear(relative.death_date)}</span>}
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(237,120,85,0.07) 0%, transparent 70%)'
        }}
      />

      {/* Bottom decorative border */}
      <div className="absolute bottom-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-foreground/6 to-transparent pointer-events-none" />
    </div>
  )
}
