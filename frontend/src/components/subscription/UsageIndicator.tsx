'use client'

import Link from 'next/link'
import { Gauge, ArrowUpCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useUser } from '@/components/providers/UserProvider'
import { cn } from '@/lib/utils'

export default function UsageIndicator() {
  const { usage } = useUser()

  if (!usage) return null

  const planName = usage.plan.display_name
  const isPaid = usage.plan.name !== 'free'

  // Показываем наиболее критичную квоту (ближайшую к лимиту)
  const criticalQuota = usage.quotas
    .filter(q => !q.is_unlimited && q.limit > 0)
    .sort((a, b) => (b.used / b.limit) - (a.used / a.limit))[0]

  const criticalPercent = criticalQuota
    ? Math.min((criticalQuota.used / criticalQuota.limit) * 100, 100)
    : 0

  return (
    <Link href="/dashboard/subscription" className="block">
      <div className="px-3 py-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors space-y-2 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">{planName}</span>
          </div>
          {!isPaid && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-azure text-azure">
              <ArrowUpCircle className="w-2.5 h-2.5 mr-0.5" />
              Обновить
            </Badge>
          )}
        </div>
        {criticalQuota && (
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{criticalQuota.display_name}</span>
              <span>{criticalQuota.used}/{criticalQuota.limit}</span>
            </div>
            <Progress
              value={criticalPercent}
              className={cn(
                'h-1',
                criticalPercent >= 100 && '[&>div]:bg-red-500',
                criticalPercent >= 80 && criticalPercent < 100 && '[&>div]:bg-amber-500',
              )}
            />
          </div>
        )}
      </div>
    </Link>
  )
}
