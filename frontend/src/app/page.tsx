'use client'

import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Hero from '@/components/home/Hero'
import HowItWorks from '@/components/home/HowItWorks'
import FamilyTimeline from '@/components/home/FamilyTimeline'
import Features from '@/components/home/Features'
import CTA from '@/components/home/CTA'

export default function Home() {
  return (
    <main className="min-h-screen relative">
      <Header />
      <Hero />
      <HowItWorks />
      <Features />
      <FamilyTimeline />
      <CTA />
      <Footer />
    </main>
  )
}
