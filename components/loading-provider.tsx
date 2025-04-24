'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useSupabase } from '@/lib/supabase-provider'
import { Loader } from '@/components/ui/loader'

type LoadingContextType = {
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: true,
  setIsLoading: () => {}
})

export const useLoading = () => useContext(LoadingContext)

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const { isLoaded: isClerkLoaded, isSignedIn } = useAuth()
  const { isLoaded: isSupabaseLoaded } = useSupabase()

  // Handle initial page load
  useEffect(() => {
    // Set a minimum loading time to prevent flashes
    const minLoadingTime = 1000
    const startTime = Date.now()

    // Check if both Clerk and Supabase are loaded
    if (isClerkLoaded && isSupabaseLoaded && !initialLoadComplete) {
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime)

      // Add a small delay to ensure everything is properly initialized
      // and to provide a minimum loading time for better UX
      const timer = setTimeout(() => {
        setIsLoading(false)
        setInitialLoadComplete(true)
      }, remainingTime + 500) // Additional 500ms for smooth transition

      return () => clearTimeout(timer)
    }
  }, [isClerkLoaded, isSupabaseLoaded, initialLoadComplete])

  // Handle route changes and re-authentication
  useEffect(() => {
    // If we've already completed initial load, but auth state changes,
    // show the loader again until auth is settled
    if (initialLoadComplete && !isClerkLoaded) {
      setIsLoading(true)
    } else if (initialLoadComplete && isClerkLoaded) {
      // Once auth is settled after a change, hide the loader
      setIsLoading(false)
    }
  }, [isClerkLoaded, initialLoadComplete])

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
          <Loader />
        </div>
      ) : (
        children
      )}
    </LoadingContext.Provider>
  )
}
