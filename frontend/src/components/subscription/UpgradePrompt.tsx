'use client'

import Link from 'next/link'
import { ArrowUpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface UpgradePromptProps {
  feature: string
  message?: string
}

export default function UpgradePrompt({ feature, message }: UpgradePromptProps) {
  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
          <ArrowUpCircle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {message || `Лимит ${feature} исчерпан`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Обновите тариф для продолжения использования
          </p>
        </div>
        <Button asChild size="sm" className="bg-azure hover:bg-azure-dark text-white shrink-0">
          <Link href="/dashboard/subscription">Улучшить план</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
