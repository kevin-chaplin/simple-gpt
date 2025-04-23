"use client"

import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, Brain, MessageSquare } from "lucide-react"
// Header removed in favor of floating controls
import { ChatInterface, ChatInterfaceRef } from "@/components/chat-interface"
import { useEffect, useState, useRef, useCallback } from "react"
import { hasExceededAnonymousLimit } from "@/lib/anonymous-usage"

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [hasUsedFreeRequest, setHasUsedFreeRequest] = useState(false)
  const chatInterfaceRef = useRef<ChatInterfaceRef>(null)

  // Force a re-render when the component mounts to ensure auth state is current
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if the user has used their free request
  useEffect(() => {
    if (typeof window !== 'undefined' && mounted && !isSignedIn) {
      setHasUsedFreeRequest(hasExceededAnonymousLimit())
    }
  }, [mounted, isSignedIn])

  // State to manually show the chat interface for anonymous users
  const [showTryItView, setShowTryItView] = useState(false)

  // Logo click functionality moved to the chat interface
  // This is now handled by the New Chat button in the sidebar and floating controls

  // Handle try it now button click
  const handleTryItNow = useCallback(() => {
    setShowTryItView(true)
  }, [])

  // Only render the authenticated view once the component has mounted and auth is loaded
  const showAuthenticatedView = isLoaded && mounted && (isSignedIn || showTryItView)

  return (
    <div className="flex flex-col h-screen">
      <main className="flex-1">
        {showAuthenticatedView ? (
          <ChatInterface ref={chatInterfaceRef} />
        ) : (
          <>
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
              <div className="pt-4 flex gap-4">
                {hasUsedFreeRequest ? (
                  <>
                    <Link href="/sign-up">
                      <Button className="px-8">
                        Sign Up Free <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/sign-in">
                      <Button variant="outline" className="px-8">
                        Sign In
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Button onClick={handleTryItNow} className="px-8">
                      Try It Now <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Link href="/sign-up">
                      <Button variant="outline" className="px-8">
                        Sign Up Free
                      </Button>
                    </Link>
                  </>
                )}
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
          </>
        )}
      </main>
    </div>
  )
}
