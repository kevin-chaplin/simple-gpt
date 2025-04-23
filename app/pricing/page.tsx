import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"

const plans = [
  {
    name: "Free",
    description: "Basic access to Simple GPT",
    price: "$0",
    features: ["5 conversations per day", "Basic AI responses", "24-hour conversation history"],
    cta: "Get Started",
    href: "/dashboard",
  },
  {
    name: "Pro",
    description: "Enhanced features for regular users",
    price: "$9.99",
    features: ["Unlimited conversations", "Priority response time", "30-day conversation history"],
    cta: "Subscribe",
    href: "/dashboard",
    popular: true,
  },
  {
    name: "Premium",
    description: "Maximum capabilities for power users",
    price: "$19.99",
    features: ["Everything in Pro", "Unlimited conversation history", "Priority support"],
    cta: "Subscribe",
    href: "/dashboard",
  },
]

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center font-bold text-xl text-primary">
            Simple GPT
          </Link>
          <div className="flex items-center gap-4">
            <nav className="flex gap-4 sm:gap-6">
              <Link href="/dashboard" className="text-sm font-medium hover:underline underline-offset-4">
                Dashboard
              </Link>
              <Link href="/pricing" className="text-sm font-medium hover:underline underline-offset-4">
                Pricing
              </Link>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">Simple, Transparent Pricing</h1>
              <p className="mt-4 text-muted-foreground md:text-xl">
                Choose the plan that works best for you. All plans include access to Simple GPT.
              </p>
            </div>
            <div className="grid gap-8 mt-16 md:grid-cols-3 max-w-5xl mx-auto">
              {plans.map((plan) => (
                <Card key={plan.name} className={plan.popular ? "border-primary shadow-lg relative" : "border-border"}>
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
                    <Button asChild className="w-full" variant={plan.popular ? "default" : "outline"}>
                      <Link href={plan.href}>{plan.cta}</Link>
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
                    Yes, our Free plan allows you to try the basic features of Simple GPT without any commitment.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium">What payment methods do you accept?</h3>
                  <p className="text-muted-foreground mt-1">
                    We accept all major credit cards, including Visa, Mastercard, and American Express.
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
