import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

interface LegalPageLayoutProps {
  title: string
  updatedAt: string
  children: React.ReactNode
}

export default function LegalPageLayout({ title, updatedAt, children }: LegalPageLayoutProps) {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 sm:pt-28 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-azure transition-colors mb-8 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            На главную
          </Link>

          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">{title}</h1>
          <p className="text-sm text-muted-foreground mb-10">
            Дата последнего обновления: {updatedAt}
          </p>

          <article className="legal-content">
            {children}
          </article>
        </div>
      </main>
      <Footer />
    </>
  )
}
