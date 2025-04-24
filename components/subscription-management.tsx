"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { UsageLimitAlert } from "@/components/usage-limit-alert"

type Subscription = {
  id: string
  user_id: string
  plan: string
  stripe_customer_id: string
  stripe_subscription_id: string
  status: string
  created_at: string
  updated_at: string
}

export function SubscriptionManagement() {
  const { userId, isLoaded, isSignedIn } = useAuth()
  const router = useRouter()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [managingSubscription, setManagingSubscription] = useState(false)

  // Fetch the user's subscription
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!isLoaded || !isSignedIn) return

      try {
        const response = await fetch("/api/subscriptions/current")

        if (!response.ok) {
          throw new Error("Failed to fetch subscription")
        }

        const data = await response.json()
        setSubscription(data.subscription)
      } catch (error) {
        console.error("Error fetching subscription:", error)
        toast({
          title: "Error",
          description: "Failed to load subscription information",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (isLoaded && isSignedIn) {
      fetchSubscription()
    } else if (isLoaded && !isSignedIn) {
      setLoading(false)
    }
  }, [isLoaded, isSignedIn, userId])

  const handleManageSubscription = async () => {
    try {
      setManagingSubscription(true)

      const response = await fetch("/api/stripe/manage", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to create management session")
      }

      const data = await response.json()
      window.location.href = data.url
    } catch (error) {
      console.error("Error managing subscription:", error)
      toast({
        title: "Error",
        description: "Failed to open subscription management",
        variant: "destructive",
      })
    } finally {
      setManagingSubscription(false)
    }
  }

  const getPlanDetails = (planId: string) => {
    switch (planId) {
      case "pro":
        return {
          name: "Pro",
          price: "$9.99/month",
          features: ["Unlimited conversations", "Priority response time", "30-day conversation history"],
        }
      case "premium":
        return {
          name: "Premium",
          price: "$19.99/month",
          features: ["Everything in Pro", "Unlimited conversation history", "Priority support"],
        }
      default:
        return {
          name: "Free",
          price: "Free",
          features: ["5 conversations per day", "Basic AI responses", "24-hour conversation history"],
        }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Sign in to manage your subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <p>You need to be signed in to view and manage your subscription.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => router.push("/sign-in")}>Sign In</Button>
        </CardFooter>
      </Card>
    )
  }

  const plan = subscription?.plan || "free"
  const status = subscription?.status || "inactive"
  const planDetails = getPlanDetails(plan)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Subscription</CardTitle>
        <CardDescription>Manage your Simple GPT subscription</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">{planDetails.name} Plan</h3>
            <p className="text-muted-foreground">{planDetails.price}</p>
          </div>

          {status !== "inactive" && plan !== "free" && (
            <div>
              <h4 className="font-medium">Status</h4>
              <p className="capitalize">{status}</p>
            </div>
          )}

          {/* Show usage limits */}
          <div>
            <h4 className="font-medium">Usage</h4>
            <div className="mt-2">
              <UsageLimitAlert />
            </div>
          </div>

          <div>
            <h4 className="font-medium">Features</h4>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {planDetails.features.map((feature, index) => (
                <li key={index} className="text-sm text-muted-foreground">{feature}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
        {plan !== "free" && (
          <Button
            onClick={handleManageSubscription}
            disabled={managingSubscription}
            className="w-full sm:w-auto"
          >
            {managingSubscription ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Manage Subscription"
            )}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => router.push("/pricing")}
          className="w-full sm:w-auto"
        >
          {plan === "free" ? "Upgrade Plan" : "Change Plan"}
        </Button>
      </CardFooter>
    </Card>
  )
}
