"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth, useUser } from "@clerk/nextjs"
import { ArrowLeft } from "lucide-react"
import { UserProfile as ClerkUserProfile } from "@clerk/nextjs"

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useUser()
  const { isSignedIn, isLoaded } = useAuth()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in')
    }
  }, [isLoaded, isSignedIn, router])

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted || !isLoaded || !isSignedIn) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <ClerkUserProfile path="/profile" routing="path" />
        </div>
      </main>
    </div>
  )
}
