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
  hasMessageLimit: boolean
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
  const [hasMessageLimit, setHasMessageLimit] = useState(true)
  const { toast } = useToast()

  // Check if the user has reached their daily limit
  const checkUsage = useCallback(async () => {
    console.log("Checking usage limits, auth state:", { isLoaded, isSignedIn })

    if (!isLoaded) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)

      console.log("Fetching current usage from API")

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      // Fetch the user's current usage
      const response = await fetch("/api/usage/current", {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn("API error:", response.status, response.statusText);
        // Handle the error gracefully with default values
        setMessageCount(0);
        setMessageLimit(isSignedIn ? PLAN_LIMITS.free.dailyMessageLimit : 5);
        setHasReachedLimit(false);
        setTimeUntilReset("24 hours");
        throw new Error("Failed to fetch usage")
      }

      const data = await response.json()
      console.log("Usage data received:", data)

      setMessageCount(data.messageCount)
      setMessageLimit(data.messageLimit)
      setHasReachedLimit(data.hasReachedLimit)
      setTimeUntilReset(data.timeUntilReset)
      setHasMessageLimit(data.hasMessageLimit)

      console.log("Updated usage state:", {
        messageCount: data.messageCount,
        messageLimit: data.messageLimit,
        hasReachedLimit: data.hasReachedLimit,
        timeUntilReset: data.timeUntilReset,
        hasMessageLimit: data.hasMessageLimit
      })

      return data
    } catch (error) {
      console.error("Error checking usage:", error)
      // Don't show toast for AbortError (timeout)
      if (error.name !== 'AbortError') {
        toast({
          title: "Error",
          description: "Failed to check usage limits. Using default limits.",
          variant: "destructive",
        })
      }
      
      // Set sensible defaults even when there's an error
      if (messageCount === 0 && messageLimit === PLAN_LIMITS.free.dailyMessageLimit) {
        setMessageCount(0);
        setMessageLimit(isSignedIn ? PLAN_LIMITS.free.dailyMessageLimit : 5);
        setHasReachedLimit(false);
        setTimeUntilReset("24 hours");
        setHasMessageLimit(true);
      }
    } finally {
      setIsLoading(false)
    }
  }, [isLoaded, isSignedIn, toast, messageCount, messageLimit])

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
      if (hasMessageLimit && currentCount + 1 >= currentLimit) {
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
      if (data.hasMessageLimit !== undefined) {
        setHasMessageLimit(data.hasMessageLimit)
      }
    } catch (error) {
      console.error("Error incrementing usage:", error)
      // Revert the local increment if the server update fails
      setMessageCount((prev) => Math.max(0, prev - 1))
      setHasReachedLimit(false)
    }
  }, [isLoaded, isSignedIn, hasMessageLimit, messageCount, messageLimit])

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
    hasMessageLimit,
    checkUsage,
    incrementUsage,
  }
}
