"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { Check, ArrowLeft, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { toast } from "@/components/ui/use-toast"
import { UserProfile } from "@/components/user-profile"

// Define the pricing plans with Stripe IDs
const plans = [
  {
    id: "free",
    name: "Free",
    description: "Basic access to Sensible GPT",
    price: "$0",
    features: ["5 conversations per day", "Basic AI responses", "7-day conversation history"],
    cta: "Get Started",
  },
  {
    id: "pro",
    name: "Pro",
    description: "Enhanced features for regular users",
    price: "$9.99",
    features: ["Unlimited conversations", "Priority response time", "30-day conversation history"],
    cta: "Subscribe",
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    description: "Maximum capabilities for power users",
    price: "$19.99",
    features: ["Everything in Pro", "Unlimited conversation history", "Priority support"],
    cta: "Subscribe",
  },
]

export default function PricingPage() {
  const router = useRouter()
  const { isSignedIn, isLoaded } = useAuth()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // Check for success or canceled parameters from Stripe redirect
  useEffect(() => {
    if (searchParams.get("success")) {
      toast({
        title: "Subscription successful!",
        description: "Thank you for subscribing to Sensible GPT.",
      })
    }

    if (searchParams.get("canceled")) {
      toast({
        title: "Subscription canceled",
        description: "Your subscription process was canceled.",
        variant: "destructive",
      })
    }
  }, [searchParams])

  const handleSubscribe = async (planId: string) => {
    try {
      // If the plan is free, no need to go through Stripe
      if (planId === "free") {
        router.push("/")
        return
      }

      // Check if the user is signed in
      if (!isSignedIn) {
        toast({
          title: "Sign in required",
          description: "Please sign in to subscribe to a plan",
          variant: "destructive",
        })
        router.push("/sign-in?redirect=/pricing")
        return
      }

      setIsLoading(planId)

      // Call the API to create a checkout session
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: planId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session")
      }

      // Redirect to Stripe checkout
      window.location.href = data.url
    } catch (error) {
      console.error("Error subscribing to plan:", error)
      toast({
        title: "Error",
        description: "Failed to process subscription. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Floating controls in top-right corner */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2" style={{ border: 'none', boxShadow: 'none' }}>
        {/* Theme toggle */}
        <ThemeToggle />

        {/* User account controls */}
        {isSignedIn ? (
          <UserProfile />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm border-0"
            onClick={() => router.push('/sign-in')}
          >
            <User className="h-4 w-4 mr-1" />
            <span className="sr-only sm:not-sr-only">Sign In</span>
          </Button>
        )}
      </div>

      {/* Back button - floating in top-left */}
      <div className="fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm border-0"
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span className="sr-only sm:not-sr-only">Back</span>
        </Button>
      </div>

      <main className="flex-1 pt-16">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">Sensible, Transparent Pricing</h1>
              <p className="mt-4 text-muted-foreground md:text-xl">
                Choose the plan that works best for you. All plans include access to Sensible GPT.
              </p>
            </div>
            <div className="grid gap-8 mt-16 md:grid-cols-3 max-w-5xl mx-auto">
              {plans.map((plan) => (
                <Card key={plan.id} className={plan.popular ? "border-primary shadow-lg relative" : "border-border"}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-0 right-0 flex justify-center">
                      <div className="bg-primary text-primary-foreground text-sm font-medium py-1 px-3 rounded-full">
                        Most Popular
                      </div>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      {plan.price !== "$0" && <span className="text-muted-foreground ml-1">/month</span>}
                    </div>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center">
                          <Check className="mr-2 h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={isLoading === plan.id}
                    >
                      {isLoading === plan.id
                        ? "Processing..."
                        : plan.cta}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
            <div className="mx-auto max-w-3xl text-center mt-16">
              <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
              <div className="mt-8 grid gap-6 text-left max-w-2xl mx-auto">
                <div>
                  <h3 className="text-lg font-medium">Can I switch plans later?</h3>
                  <p className="text-muted-foreground mt-1">
                    Yes, you can upgrade or downgrade your plan at any time. Changes will be applied at the start of
                    your next billing cycle.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium">Is there a free trial?</h3>
                  <p className="text-muted-foreground mt-1">
                    Yes, our Free plan allows you to try the basic features of Sensible GPT without any commitment.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium">What payment methods do you accept?</h3>
                  <p className="text-muted-foreground mt-1">
                    We accept all major credit cards, including Visa, Mastercard, and American Express through our secure Stripe integration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
