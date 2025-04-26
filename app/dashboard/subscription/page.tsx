"use client"

import { useState, useEffect } from "react"
import { Check, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useAuth } from "@clerk/nextjs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const plans = [
  {
    name: "Free",
    description: "Basic access to Sensible GPT",
    price: "$0",
    features: ["5 conversations per day", "Basic AI responses", "7-day conversation history"],
    priceId: "free",
  },
  {
    name: "Pro",
    description: "Enhanced features for regular users",
    price: "$9.99",
    features: ["Unlimited conversations", "Priority response time", "30-day conversation history"],
    priceId: "pro",
  },
  {
    name: "Premium",
    description: "Maximum capabilities for power users",
    price: "$19.99",
    features: ["Everything in Pro", "Unlimited conversation history", "Priority support"],
    priceId: "premium",
  },
]

export default function SubscriptionPage() {
  const [currentPlan, setCurrentPlan] = useState("free")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPlan, setIsLoadingPlan] = useState(true)
  const [isCanceling, setIsCanceling] = useState(false)
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false)
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userId, isLoaded } = useAuth()

  // Check for success parameter from Stripe checkout
  useEffect(() => {
    if (searchParams.get("success")) {
      toast({
        title: "Payment successful!",
        description: "Thank you for subscribing. Your plan has been upgraded.",
        duration: 5000,
      })

      // Remove the success parameter from the URL
      const url = new URL(window.location.href)
      url.searchParams.delete("success")
      window.history.replaceState({}, "", url.toString())
    }
  }, [searchParams, toast])

  // Fetch the user's current plan from the database
  useEffect(() => {
    const fetchCurrentPlan = async () => {
      if (!isLoaded || !userId) return

      try {
        setIsLoadingPlan(true)
        const supabase = createClientSupabaseClient()

        const { data, error } = await supabase
          .from("subscriptions")
          .select("plan, status, cancel_at_period_end, current_period_end")
          .eq("user_id", userId)
          .single()

        if (error) {
          console.error("Error fetching subscription:", error)
          return
        }

        if (data && data.status === "active") {
          console.log("Current plan:", data.plan)
          setCurrentPlan(data.plan)

          // Set cancellation status
          if (data.cancel_at_period_end) {
            setCancelAtPeriodEnd(true)

            // Format the current period end date
            if (data.current_period_end) {
              setCurrentPeriodEnd(data.current_period_end)
            }
          }
        } else {
          console.log("No active subscription found, defaulting to free plan")
          setCurrentPlan("free")
        }
      } catch (error) {
        console.error("Error fetching subscription:", error)
      } finally {
        setIsLoadingPlan(false)
      }
    }

    fetchCurrentPlan()
  }, [userId, isLoaded])

  const handleSubscribe = async (priceId: string) => {
    if (isLoading || !userId) return
    setIsLoading(true)

    try {
      // Call the API to create a checkout session
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: priceId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session")
      }

      // Redirect to Stripe checkout
      window.location.href = data.url
    } catch (error) {
      console.error("Error subscribing:", error)
      toast({
        title: "Error",
        description: "Failed to process subscription. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (isCanceling || !userId || currentPlan === "free") return
    setIsCanceling(true)

    try {
      // Call the API to cancel the subscription
      const response = await fetch("/api/stripe/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel subscription")
      }

      // Update the UI to show the subscription will be canceled
      setCancelAtPeriodEnd(true)
      if (data.current_period_end) {
        setCurrentPeriodEnd(data.current_period_end)
      }

      toast({
        title: "Subscription canceled",
        description: "Your subscription will end at the end of the current billing period.",
      })
    } catch (error) {
      console.error("Error canceling subscription:", error)
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCanceling(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8 text-center max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold">Subscription Plans</h1>
        <p className="text-muted-foreground mt-2">Choose the plan that works best for you</p>

        {searchParams.get("success") && (
          <div className="mt-4 p-4 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded-lg">
            <p className="font-medium">Payment successful! Your subscription has been updated.</p>
          </div>
        )}
      </div>

      {isLoadingPlan ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.priceId === currentPlan ? "border-primary shadow-lg" : "border-border"}>
              {plan.priceId === currentPlan && (
                <div className="absolute -top-3 left-0 right-0 flex justify-center">
                  <div className="bg-primary text-primary-foreground text-sm font-medium py-1 px-3 rounded-full">
                    Current Plan
                  </div>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  {plan.price !== "$0" && <span className="text-muted-foreground"> /month</span>}
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                {plan.priceId === currentPlan && cancelAtPeriodEnd && (
                  <div className="w-full p-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 rounded-md mb-2 text-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Your subscription will end on {currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString() : 'the end of your billing period'}</span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => handleSubscribe(plan.priceId)}
                  className="w-full"
                  variant={plan.priceId === currentPlan ? "outline" : "default"}
                  disabled={isLoading || plan.priceId === currentPlan || (plan.priceId === currentPlan && cancelAtPeriodEnd)}
                >
                  {isLoading && plan.priceId !== currentPlan ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-current rounded-full"></span>
                      Processing...
                    </span>
                  ) : (
                    plan.priceId === currentPlan ? (cancelAtPeriodEnd ? "Cancellation Pending" : "Current Plan") : `Subscribe to ${plan.name}`
                  )}
                </Button>

                {plan.priceId === currentPlan && plan.priceId !== "free" && !cancelAtPeriodEnd && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full mt-2 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-800 dark:hover:bg-red-950">
                        Cancel Subscription
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your subscription will remain active until the end of your current billing period. After that, you'll be downgraded to the free plan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep My Subscription</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancelSubscription}
                          disabled={isCanceling}
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          {isCanceling ? (
                            <span className="flex items-center">
                              <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-current rounded-full"></span>
                              Canceling...
                            </span>
                          ) : (
                            "Yes, Cancel Subscription"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
