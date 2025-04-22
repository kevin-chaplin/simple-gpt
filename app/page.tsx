import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, Brain, MessageSquare } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Home() {
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
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI made simple for everyone</span>
              </div>
              <div className="space-y-2 max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  <span className="text-primary">Simple GPT</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Get answers in simple, easy-to-understand language. No technical jargon, just clear explanations.
                </p>
              </div>
              <div className="pt-4">
                <Link href="/dashboard">
                  <Button className="px-8">
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 items-start max-w-5xl mx-auto">
              <div className="flex flex-col items-center space-y-2 border rounded-lg p-6 bg-card">
                <div className="p-2 bg-primary/10 text-primary rounded-full">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Simple Language</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Get explanations as if they were meant for a 5-year-old. No complicated words or confusing terms.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border rounded-lg p-6 bg-card">
                <div className="p-2 bg-primary/10 text-primary rounded-full">
                  <Brain className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Smart Answers</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Powered by advanced AI that explains complex topics in ways that are easy for anyone to understand.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border rounded-lg p-6 bg-card sm:col-span-2 lg:col-span-1 sm:max-w-md sm:mx-auto lg:max-w-none">
                <div className="p-2 bg-primary/10 text-primary rounded-full">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 2v20" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Affordable Plans</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Choose from flexible subscription options that fit your needs and budget.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t">
        <div className="container mx-auto px-4 md:px-6 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">© 2023 Simple GPT. All rights reserved.</p>
            <nav className="flex gap-4 sm:gap-6">
              <Link
                href="#"
                className="text-xs text-muted-foreground hover:text-primary hover:underline underline-offset-4"
              >
                Terms of Service
              </Link>
              <Link
                href="#"
                className="text-xs text-muted-foreground hover:text-primary hover:underline underline-offset-4"
              >
                Privacy
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
