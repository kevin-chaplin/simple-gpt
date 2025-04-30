'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Brain } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Loader() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Simulate loading progress
  useEffect(() => {
    if (!mounted) return

    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + Math.random() * 15
      })
    }, 400)

    return () => clearInterval(interval)
  }, [mounted])

  if (!mounted) {
    // Return a simple loader for SSR
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="h-16 w-16 animate-pulse rounded-full border-4 border-primary/20 border-t-primary"></div>
        <div className="text-xl font-semibold text-primary">Sensible GPT</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-8">
      {/* Logo animation */}
      <div className="relative flex items-center justify-center">
        {/* Pulsing circle behind logo */}
        <div className="absolute h-28 w-28 animate-pulse rounded-full bg-primary/10"></div>

        {/* Rotating border */}
        <div className="absolute h-24 w-24 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>

        {/* Brain icon */}
        <div className="absolute animate-scale-in">
          <Brain className="h-12 w-12 text-primary" />
        </div>

        {/* Text logo with fade-in animation - increased margin-top to prevent overlap */}
        <div className="z-10 mt-40 animate-fade-in text-2xl font-bold text-primary">
          Sensible GPT
        </div>
      </div>

      {/* Loading text with fade-in animation */}
      <div className="flex flex-col items-center space-y-4">
        <div className="text-sm text-muted-foreground animate-pulse">
          Loading your AI assistant...
        </div>

        {/* Progress bar */}
        <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${Math.min(loadingProgress, 100)}%` }}
          ></div>
        </div>

        {/* Loading steps */}
        <div className="text-xs text-muted-foreground">
          {loadingProgress < 30 && "Initializing..."}
          {loadingProgress >= 30 && loadingProgress < 60 && "Loading authentication..."}
          {loadingProgress >= 60 && loadingProgress < 90 && "Connecting to database..."}
          {loadingProgress >= 90 && "Almost ready..."}
        </div>
      </div>
    </div>
  )
}
