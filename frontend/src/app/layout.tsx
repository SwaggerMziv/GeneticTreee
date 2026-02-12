import type { Metadata } from 'next'
import { Comfortaa, Nunito } from 'next/font/google'
import ThemeProvider from '@/components/providers/ThemeProvider'
import AntdProvider from '@/components/providers/AntdProvider'
import { Toaster } from 'sonner'
import './globals.css'

const comfortaa = Comfortaa({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-comfortaa',
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-heading',
  weight: ['400', '600', '700', '800', '900'],
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
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${comfortaa.variable} ${nunito.variable} font-sans`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AntdProvider>
            {children}
            <Toaster
              position="top-right"
              closeButton
              theme="dark"
              toastOptions={{
                style: {
                  background: '#1c1c1e',
                  border: '1px solid #2c2c2e',
                  color: '#f5f5f7',
                },
                classNames: {
                  error: '!bg-red-950 !border-red-900 !text-red-100',
                  success: '!bg-green-950 !border-green-900 !text-green-100',
                  warning: '!bg-yellow-950 !border-yellow-900 !text-yellow-100',
                  info: '!bg-blue-950 !border-blue-900 !text-blue-100',
                  closeButton: '!bg-neutral-800 !border-neutral-700 !text-neutral-300 hover:!bg-neutral-700',
                },
              }}
            />
          </AntdProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
