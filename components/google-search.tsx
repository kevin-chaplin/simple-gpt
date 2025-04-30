"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Search, Sparkles, AlertCircle, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useUsageLimits } from "@/hooks/use-usage-limits"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"

interface GoogleSearchProps {
  onSearch: (query: string) => void
  isLoading?: boolean
  error: string | null
}

export function GoogleSearch({ onSearch, isLoading, error }: GoogleSearchProps) {
  const [query, setQuery] = useState("")
  const { toast } = useToast()
  const { hasReachedLimit, messageLimit, timeUntilReset, checkUsage } = useUsageLimits()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the input when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim() && !isLoading) {
      try {
        // Submit the search query

        // Disable the form temporarily to prevent double submissions
        const currentQuery = query
        setQuery("") // Clear the input immediately

        // Call the onSearch function with the query
        onSearch(currentQuery)
      } catch (error) {
        console.error("Error in GoogleSearch handleSubmit:", error)
        toast({
          title: "Search Error",
          description: "Failed to process your search. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto">
      {/* Logo and title */}
      <div className="flex items-center justify-center mb-6">
        <Bot className="h-8 w-8 sm:h-10 sm:w-10 text-primary mr-2" />
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">Sensible GPT</h1>
      </div>

      {/* Tagline */}
      <div className="text-center mb-6">
        <p className="text-sm text-muted-foreground">
          Explains everything sensibly
        </p>
      </div>

      {/* Search form */}
      <div className="w-full max-w-md mx-auto mb-8">
        <form onSubmit={handleSubmit} className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder={hasReachedLimit ? "Daily limit reached." : "Ask me anything..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pr-20 h-12 text-base sm:text-lg rounded-full shadow-md focus:ring-2 focus:ring-primary"
            disabled={isLoading || hasReachedLimit}
          />
          <Button
            type="submit"
            className="absolute right-1 top-1 h-10 rounded-full"
            disabled={isLoading || !query.trim() || hasReachedLimit}
          >
            {isLoading ? "Thinking..." : "Search"}
          </Button>
        </form>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 mb-4 text-red-500 text-sm">{error}</div>
      )}

      {/* Sample questions */}
      <div className="mt-4 w-full max-w-xl">
        <h2 className="text-lg sm:text-xl font-medium mb-4 text-center">Try asking</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm sm:text-base">
          <Button
            variant="outline"
            className="justify-start h-auto py-2 px-3 text-left"
            onClick={() => onSearch("What is artificial intelligence?")}
          >
            What is artificial intelligence?
          </Button>
          <Button
            variant="outline"
            className="justify-start h-auto py-2 px-3 text-left"
            onClick={() => onSearch("How can I learn programming?")}
          >
            How can I learn programming?
          </Button>
          <Button
            variant="outline"
            className="justify-start h-auto py-2 px-3 text-left"
            onClick={() => onSearch("Explain quantum computing simply")}
          >
            Explain quantum computing simply
          </Button>
          <Button
            variant="outline"
            className="justify-start h-auto py-2 px-3 text-left"
            onClick={() => onSearch("Write a poem about technology")}
          >
            Write a poem about technology
          </Button>
        </div>
      </div>
    </div>
  )
}
