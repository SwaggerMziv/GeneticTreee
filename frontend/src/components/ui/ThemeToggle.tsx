'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="relative h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center">
        <Sun className="h-5 w-5 text-muted-foreground" />
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="relative h-10 w-10 rounded-xl bg-muted border border-border hover:border-azure/50 hover:bg-azure/10 flex items-center justify-center transition-all duration-200 group"
      aria-label="Переключить тему"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
      ) : (
        <Moon className="h-5 w-5 text-azure-dark group-hover:scale-110 transition-transform" />
      )}
    </button>
  )
}
