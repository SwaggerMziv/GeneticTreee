'use client'

import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Hero from '@/components/home/Hero'
import FamilyTreeDemo from '@/components/home/FamilyTreeDemo'
import FamilyTimeline from '@/components/home/FamilyTimeline'
import Features from '@/components/home/Features'
import Pricing from '@/components/home/Pricing'
import CTA from '@/components/home/CTA'
import BlobCursor from '@/components/ui/BlobCursor'
import AnimatedBackground from '@/components/ui/AnimatedBackground'

export default function Home() {
  return (
    <main className="min-h-screen relative">
      <BlobCursor />
      <AnimatedBackground particleCount={40} color="#ff6b35" speed={0.3} />
      <Header />
      <Hero />
      <FamilyTreeDemo />
      <FamilyTimeline />
      <Features />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  )
}
