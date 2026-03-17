'use client'

import { Progress } from '@/components/ui/progress'
import { Infinity } from 'lucide-react'
import { QuotaItem } from '@/types'
import { cn } from '@/lib/utils'

interface QuotaProgressProps {
  quota: QuotaItem
  compact?: boolean
}

export default function QuotaProgress({ quota, compact = false }: QuotaProgressProps) {
  if (quota.is_unlimited) {
    return (
      <div className={cn('space-y-1', compact && 'space-y-0.5')}>
        <div className="flex items-center justify-between text-sm">
          <span className={cn(compact && 'text-xs')}>{quota.display_name}</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            {quota.used} / <Infinity className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    )
  }

  const percentage = quota.limit > 0 ? Math.min((quota.used / quota.limit) * 100, 100) : 0
  const isNearLimit = percentage >= 80
  const isExhausted = percentage >= 100

  return (
    <div className={cn('space-y-1', compact && 'space-y-0.5')}>
      <div className="flex items-center justify-between text-sm">
        <span className={cn(compact && 'text-xs')}>{quota.display_name}</span>
        <span className={cn(
          'text-muted-foreground',
          compact && 'text-xs',
          isExhausted && 'text-red-500 font-medium',
          isNearLimit && !isExhausted && 'text-amber-500',
        )}>
          {quota.used} / {quota.limit}
        </span>
      </div>
      <Progress
        value={percentage}
        className={cn(
          'h-2',
          compact && 'h-1.5',
          isExhausted && '[&>div]:bg-red-500',
          isNearLimit && !isExhausted && '[&>div]:bg-amber-500',
          !isNearLimit && !isExhausted && '[&>div]:bg-azure',
        )}
      />
    </div>
  )
}
