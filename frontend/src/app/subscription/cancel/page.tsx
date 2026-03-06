'use client'

import Link from 'next/link'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function SubscriptionCancelPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-6 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold">Оплата отменена</h1>
          <p className="text-muted-foreground">
            Платёж не был совершён. Вы можете попробовать снова в любое время.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button asChild className="bg-azure hover:bg-azure-dark text-white">
              <Link href="/dashboard/subscription">Тарифные планы</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">На главную</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
