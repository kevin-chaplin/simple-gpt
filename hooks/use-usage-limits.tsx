"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@clerk/nextjs"
import { useToast } from "@/components/ui/use-toast"
import { PLAN_LIMITS } from "@/lib/usage-utils"

// Re-export PLAN_LIMITS for client-side use
export { PLAN_LIMITS }

export interface UsageLimits {
  isLoading: boolean
  hasReachedLimit: boolean
  messageCount: number
  messageLimit: number
  timeUntilReset: string
  checkUsage: () => Promise<void>
  incrementUsage: () => Promise<void>
}

export function useUsageLimits(): UsageLimits {
  const { isSignedIn, isLoaded } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [hasReachedLimit, setHasReachedLimit] = useState(false)
  const [messageCount, setMessageCount] = useState(0)
  const [messageLimit, setMessageLimit] = useState(PLAN_LIMITS.free.dailyMessageLimit)
  const [timeUntilReset, setTimeUntilReset] = useState("")
  const { toast } = useToast()

  // Check if the user has reached their daily limit
  const checkUsage = useCallback(async () => {
    console.log("Checking usage limits, auth state:", { isLoaded, isSignedIn })

    if (!isLoaded || !isSignedIn) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)

      console.log("Fetching current usage from API")

      // Fetch the user's current usage
      const response = await fetch("/api/usage/current")

      if (!response.ok) {
        throw new Error("Failed to fetch usage")
      }

      const data = await response.json()
      console.log("Usage data received:", data)

      setMessageCount(data.messageCount)
      setMessageLimit(data.messageLimit)
      setHasReachedLimit(data.hasReachedLimit)
      setTimeUntilReset(data.timeUntilReset)

      console.log("Updated usage state:", {
        messageCount: data.messageCount,
        messageLimit: data.messageLimit,
        hasReachedLimit: data.hasReachedLimit,
        timeUntilReset: data.timeUntilReset
      })

      return data
    } catch (error) {
      console.error("Error checking usage:", error)
      toast({
        title: "Error",
        description: "Failed to check usage limits",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [isLoaded, isSignedIn, toast])

  // Increment the user's message count
  const incrementUsage = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      return
    }

    try {
      // Store current values to avoid closure issues
      const currentCount = messageCount;
      const currentLimit = messageLimit;

      // Increment the message count locally first for immediate feedback
      setMessageCount(currentCount + 1)

      // Check if the user has reached their limit
      if (currentCount + 1 >= currentLimit) {
        setHasReachedLimit(true)
      }

      // Update the usage on the server
      const response = await fetch("/api/usage/increment", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to increment usage")
      }

      const data = await response.json()

      // Update with the server's response
      setMessageCount(data.messageCount)
      setHasReachedLimit(data.hasReachedLimit)
    } catch (error) {
      console.error("Error incrementing usage:", error)
      // Revert the local increment if the server update fails
      setMessageCount((prev) => Math.max(0, prev - 1))
      setHasReachedLimit(false)
    }
  }, [isLoaded, isSignedIn])

  // Check usage when the component mounts
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      checkUsage()
    } else if (isLoaded && !isSignedIn) {
      setIsLoading(false)
    }
  }, [isLoaded, isSignedIn])

  return {
    isLoading,
    hasReachedLimit,
    messageCount,
    messageLimit,
    timeUntilReset,
    checkUsage,
    incrementUsage,
  }
}
