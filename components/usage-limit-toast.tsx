"use client"

import { useEffect, useState } from "react"
import { useUsageLimits } from "@/hooks/use-usage-limits"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function UsageLimitToast() {
  const { hasReachedLimit, messageLimit, timeUntilReset, checkUsage } = useUsageLimits()
  const { toast } = useToast()
  const router = useRouter()
  const [hasShownToast, setHasShownToast] = useState(false)
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null)

  // Function to show the toast
  const showLimitToast = () => {
    console.log("UsageLimitToast: Showing limit reached toast")
    toast({
      title: "Daily limit reached",
      description: (
        <div>
          <p>You've reached your daily limit of {messageLimit} messages. Your limit will reset in {timeUntilReset}.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => router.push("/pricing")}
          >
            Upgrade Plan
          </Button>
        </div>
      ),
      variant: "destructive",
      duration: 10000, // Show for 10 seconds
    })

    setHasShownToast(true)
  }

  // Check usage when the component mounts
  useEffect(() => {
    console.log("UsageLimitToast: Component mounted")

    // Force a check of usage limits when the component mounts
    const checkCurrentUsage = async () => {
      console.log("UsageLimitToast: Checking current usage")
      const data = await checkUsage()
      console.log("UsageLimitToast: Usage check result:", data)

      // Show toast immediately if limit is reached
      if (hasReachedLimit && !hasShownToast) {
        showLimitToast()
      }
    }

    // Check immediately on mount
    checkCurrentUsage()

    // Set up periodic checks (every 5 seconds)
    const interval = setInterval(() => {
      checkCurrentUsage()
    }, 5000)

    setCheckInterval(interval)

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array to run only on mount

  // Show toast when limit is reached
  useEffect(() => {
    console.log("UsageLimitToast: hasReachedLimit changed:", hasReachedLimit)

    if (hasReachedLimit && !hasShownToast) {
      showLimitToast()
    }

    // Reset the flag when the limit is no longer reached
    if (!hasReachedLimit && hasShownToast) {
      setHasShownToast(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasReachedLimit, hasShownToast])

  // This component doesn't render anything
  return null
}
