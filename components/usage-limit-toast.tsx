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

  // Function to show the toast
  const showLimitToast = () => {
    console.log("UsageLimitToast: Showing limit reached toast")

    // Use a direct toast call instead of the hook
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
    })

    setHasShownToast(true)
  }

  // Check usage when the component mounts
  useEffect(() => {
    // Only check once on mount, no periodic checks
    const checkCurrentUsage = async () => {
      try {
        const data = await checkUsage()

        // Show toast immediately if limit is reached
        if (data && data.hasReachedLimit && !hasShownToast) {
          showLimitToast()
        }
      } catch (error) {
        console.error("Error checking usage:", error)
      }
    }

    checkCurrentUsage()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array to run only on mount

  // Show toast when limit is reached
  useEffect(() => {
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
