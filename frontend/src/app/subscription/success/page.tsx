'use client'

import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function SubscriptionSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-6 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">Оплата прошла успешно!</h1>
          <p className="text-muted-foreground">
            Ваша подписка активирована. Все расширенные возможности теперь доступны.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button asChild className="bg-azure hover:bg-azure-dark text-white">
              <Link href="/dashboard/subscription">Моя подписка</Link>
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
