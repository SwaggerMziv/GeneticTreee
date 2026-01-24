import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import AntdProvider from '@/components/providers/AntdProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'GeneticTree - Family Tree Management',
  description: 'Build and manage your family tree with ease',
  keywords: ['family tree', 'genealogy', 'family history', 'ancestry'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfair.variable} bg-charcoal-950 text-white font-sans`}
        suppressHydrationWarning
      >
        <AntdProvider>
          {children}
        </AntdProvider>
      </body>
    </html>
  )
}
