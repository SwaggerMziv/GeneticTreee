'use client'

import { motion } from 'framer-motion'
import { CSSProperties } from 'react'

interface ShinyTextProps {
  children: React.ReactNode
  className?: string
  duration?: number
  animationDelay?: number
}

export default function ShinyText({
  children,
  className = '',
  duration = 3,
  animationDelay = 0,
}: ShinyTextProps) {
  return (
    <motion.span
      className={`inline-block relative ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: animationDelay }}
      style={
        {
          background: 'linear-gradient(135deg, #6BC4DD 0%, #4FABC8 50%, #6BC4DD 100%)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: `shine ${duration}s linear infinite`,
        } as CSSProperties
      }
    >
      {children}
      <style jsx>{`
        @keyframes shine {
          to {
            background-position: 200% center;
          }
        }
      `}</style>
    </motion.span>
  )
}
