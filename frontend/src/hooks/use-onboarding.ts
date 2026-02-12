'use client'

import { useState, useEffect, useCallback } from 'react'
import { FamilyRelative } from '@/types'

const STORAGE_KEY = 'genetictree_onboarding_completed'

export function useOnboarding(userId: number | undefined) {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [step, setStep] = useState(0)
  const [createdRelatives, setCreatedRelatives] = useState<FamilyRelative[]>([])

  useEffect(() => {
    if (!userId) return
    const key = `${STORAGE_KEY}_${userId}`
    const completed = localStorage.getItem(key)
    if (!completed) {
      setShowOnboarding(true)
    }
  }, [userId])

  const completeOnboarding = useCallback(() => {
    if (!userId) return
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, 'true')
    setShowOnboarding(false)
    setStep(0)
  }, [userId])

  const nextStep = useCallback(() => setStep((s) => s + 1), [])
  const prevStep = useCallback(() => setStep((s) => Math.max(0, s - 1)), [])

  const addCreatedRelative = useCallback((relative: FamilyRelative) => {
    setCreatedRelatives((prev) => [...prev, relative])
  }, [])

  return {
    showOnboarding,
    setShowOnboarding,
    step,
    setStep,
    nextStep,
    prevStep,
    completeOnboarding,
    createdRelatives,
    addCreatedRelative,
  }
}
