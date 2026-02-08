'use client'

import { TreePine } from 'lucide-react'

export default function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange to-orange-dark flex items-center justify-center animate-pulse">
          <TreePine className="w-7 h-7 text-white" strokeWidth={2.5} />
        </div>
        <div className="text-sm text-muted-foreground">Загрузка...</div>
      </div>
    </div>
  )
}
