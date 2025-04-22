"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

const plans = [
  {
    name: "Free",
    description: "Basic access to Simple GPT",
    price: "$0",
    features: ["5 conversations per day", "Basic AI responses", "24-hour conversation history"],
    priceId: "free",
  },
  {
    name: "Pro",
    description: "Enhanced features for regular users",
    price: "$9.99",
    features: ["Unlimited conversations", "Priority response time", "30-day conversation history"],
    priceId: "pro_monthly",
  },
  {
    name: "Premium",
    description: "Maximum capabilities for power users",
    price: "$19.99",
    features: ["Everything in Pro", "Unlimited conversation history", "Priority support"],
    priceId: "premium_monthly",
  },
]

export default function SubscriptionPage() {
  const [currentPlan, setCurrentPlan] = useState("free")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubscribe = async (priceId: string) => {
    if (isLoading) return

    setIsLoading(true)

    try {
      // Simulate a delay for the "payment" process
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setCurrentPlan(priceId)
    } catch (error) {
      console.error("Error subscribing:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8 text-center max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold">Subscription Plans</h1>
        <p className="text-muted-foreground mt-2">Choose the plan that works best for you</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <Card key={plan.name} className={plan.priceId === currentPlan ? "border-primary" : "border-border"}>
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
            <CardFooter>
              <Button
                onClick={() => handleSubscribe(plan.priceId)}
                className="w-full"
                variant={plan.priceId === currentPlan ? "outline" : "default"}
                disabled={isLoading || plan.priceId === currentPlan}
              >
                {plan.priceId === currentPlan ? "Current Plan" : `Subscribe to ${plan.name}`}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
