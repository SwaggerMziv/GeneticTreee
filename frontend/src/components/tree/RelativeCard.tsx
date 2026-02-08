'use client'

import { FamilyRelative } from '@/types'
import { Heart, BookOpen } from 'lucide-react'
import { getProxiedImageUrl } from '@/lib/utils'
import Image from 'next/image'

// Gender colors for card styling - more elegant palette
const GENDER_COLORS: Record<string, { bg: string; border: string; accent: string; gradient: string }> = {
  male: {
    bg: 'bg-gradient-to-b from-blue-950/90 to-slate-900/95',
    border: 'border-blue-400/60',
    accent: 'bg-blue-500',
    gradient: 'from-blue-500/20 to-transparent'
  },
  female: {
    bg: 'bg-gradient-to-b from-rose-950/90 to-slate-900/95',
    border: 'border-rose-400/60',
    accent: 'bg-rose-500',
    gradient: 'from-rose-500/20 to-transparent'
  },
  other: {
    bg: 'bg-gradient-to-b from-slate-800/90 to-slate-900/95',
    border: 'border-slate-500/60',
    accent: 'bg-slate-500',
    gradient: 'from-slate-500/20 to-transparent'
  },
}

interface RelativeCardProps {
  relative: FamilyRelative
  isSelected?: boolean
  onClick?: () => void
  size?: 'small' | 'medium' | 'large'
}

// Calculate age from birth date
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

// Format birth year
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

  // Fixed sizes in pixels to ensure consistent card dimensions
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
        ${colors.bg}
        ${isSelected ? 'ring-2 ring-orange ring-offset-2 ring-offset-charcoal-950 scale-105' : ''}
        ${isDeceased ? 'opacity-90' : ''}
        relative rounded-2xl border-2 ${colors.border} backdrop-blur-sm cursor-pointer
        transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-black/40
        flex flex-col items-center overflow-hidden group pb-3
      `}
    >
      {/* Top decorative header */}
      <div className={`absolute top-0 left-0 right-0 h-16 bg-gradient-to-b ${colors.gradient} pointer-events-none`} />

      {/* Ornamental corner decorations */}
      <svg className="absolute top-1 left-1 w-4 h-4 text-white/20" viewBox="0 0 20 20">
        <path d="M0 0 L8 0 L0 8 Z" fill="currentColor" />
      </svg>
      <svg className="absolute top-1 right-1 w-4 h-4 text-white/20" viewBox="0 0 20 20">
        <path d="M20 0 L12 0 L20 8 Z" fill="currentColor" />
      </svg>

      {/* Generation / gender / stories badges */}
      <div className="absolute top-2 left-10 right-2 z-20 flex items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-1 pointer-events-none">
          <div className="px-2 py-0.5 rounded-md bg-charcoal-800/85 border border-white/15 text-[10px] font-semibold text-white shadow-sm whitespace-nowrap">
            Пок. {generationLabel}
          </div>
          {genderLabel && (
            <div className="px-1.5 py-0.5 rounded-md bg-white/10 border border-white/10 text-[10px] uppercase tracking-wide text-gray-100 whitespace-nowrap">
              {genderLabel}
            </div>
          )}
        </div>
        {hasStories && (
          <div className="w-6 h-6 rounded-md bg-orange/90 flex items-center justify-center shadow-lg pointer-events-auto">
            <BookOpen className="w-3.5 h-3.5 text-white" />
          </div>
        )}
      </div>

      {/* Deceased ribbon */}
      {isDeceased && (
        <div className="absolute top-3 -left-8 z-10 rotate-[-45deg]">
          <div className="bg-gray-600/90 text-white text-[8px] font-medium px-8 py-0.5 shadow-md">
            В ПАМЯТИ
          </div>
        </div>
      )}

      {/* Photo / Avatar with frame */}
      <div className="relative mt-8 z-10">
        {/* Decorative frame */}
        <div className={`absolute -inset-1 rounded-lg ${colors.accent} opacity-30 blur-sm`} />
        <div className={`absolute -inset-0.5 rounded-lg border-2 ${colors.border}`} />
        <div className={`${photoSizes[size]} rounded-lg overflow-hidden bg-charcoal-700 relative`}>
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
              <span className="text-2xl font-serif font-bold text-white drop-shadow-lg">
                {relative.first_name?.charAt(0) || relative.last_name?.charAt(0) || '?'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Name with decorative underline */}
      <div className="mt-3 text-center w-full px-3 z-20">
        <p className="font-serif font-bold text-white text-sm truncate drop-shadow-sm leading-tight">
          {relative.first_name || relative.last_name
            ? `${relative.first_name || ''} ${relative.last_name || ''}`.trim()
            : <span className="text-gray-400 italic">Без имени</span>
          }
        </p>
        {middleName && (
          <p className="text-gray-300 text-[11px] truncate leading-tight">
            {middleName}
          </p>
        )}
        <div className="mx-auto mt-2 w-16 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
      </div>

      {/* Age badge */}
      <div className="mt-3 flex flex-col items-center text-center z-20 gap-1 px-4 w-full">
        {age !== null && (
          <div className={`px-2.5 py-1 rounded-full text-[12px] font-semibold inline-flex items-center gap-1
            ${isDeceased
              ? 'bg-gray-700/60 text-gray-300 border border-gray-600/50'
              : 'bg-green-900/60 text-green-300 border border-green-500/40'
            }`}
          >
            {!isDeceased && <Heart className="w-3 h-3" />}
            {age} лет
          </div>
        )}
        <div className="text-[11px] text-gray-300 flex flex-wrap justify-center gap-x-1 leading-tight">
          {relative.birth_date && <span>р. {formatYear(relative.birth_date)}</span>}
          {relative.death_date && <span>✝ {formatYear(relative.death_date)}</span>}
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255,107,53,0.1) 0%, transparent 70%)'
        }}
      />

      {/* Bottom decorative border */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
    </div>
  )
}
