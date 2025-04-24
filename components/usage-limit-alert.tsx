"use client"

import { useEffect } from "react"
import { AlertCircle, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { useUsageLimits } from "@/hooks/use-usage-limits"
import { useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function UsageLimitAlert() {
  const { isSignedIn } = useAuth()
  const {
    isLoading,
    hasReachedLimit,
    messageCount,
    messageLimit,
    timeUntilReset,
    checkUsage
  } = useUsageLimits()
  const router = useRouter()

  // Refresh usage data when the component mounts, but only once
  useEffect(() => {
    let isMounted = true;

    if (isSignedIn && isMounted) {
      // Add a small delay to avoid multiple simultaneous calls
      const timer = setTimeout(() => {
        checkUsage();
      }, 500);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [isSignedIn, checkUsage])

  // Don't show anything if loading or not signed in
  if (isLoading || !isSignedIn) {
    return null
  }

  // Don't show anything if the user has unlimited messages
  if (messageLimit < 0 || messageLimit === Infinity) {
    return null
  }

  // Calculate progress percentage
  const progressPercentage = Math.min(100, (messageCount / messageLimit) * 100)

  // If the user has reached their limit, show a warning
  if (hasReachedLimit) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Daily limit reached</AlertTitle>
        <AlertDescription>
          <p>
            You&apos;ve reached your daily limit of {messageLimit} messages.
            Your limit will reset in {timeUntilReset}.
          </p>
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/pricing")}
            >
              Upgrade Plan
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  // If the user is approaching their limit (>80%), show a warning
  if (progressPercentage >= 80) {
    return (
      <Alert variant="warning" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Approaching daily limit</AlertTitle>
        <AlertDescription>
          <p>
            You&apos;ve used {messageCount} of {messageLimit} messages today.
            Your limit will reset in {timeUntilReset}.
          </p>
          <Progress value={progressPercentage} className="mt-2" />
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/pricing")}
            >
              Upgrade Plan
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  // Otherwise, don't show anything
  return null
}
