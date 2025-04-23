"use client"

import type React from "react"
import { useState } from "react"
import { Search, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

interface GoogleSearchProps {
  onSearch: (query: string) => void
  isLoading?: boolean
  error?: string | null
}

export function GoogleSearch({ onSearch, isLoading }: GoogleSearchProps) {
  const [query, setQuery] = useState("")
  const { toast } = useToast()

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
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto px-4 py-8 h-full">
      <div className="text-4xl md:text-5xl font-bold mb-4 text-center">
        <span className="text-primary">Simple GPT</span>
      </div>

      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm mb-4">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Explains everything simply</span>
        </div>
        <p className="text-muted-foreground">
          Ask me anything and I'll explain it in simple, easy-to-understand terms.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative w-full">
          <div className="flex items-center border rounded-full overflow-hidden shadow-sm hover:shadow-md focus-within:shadow-md">
            <div className="pl-4">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask me anything..."
              className="w-full py-3 px-4 outline-none bg-transparent"
              disabled={isLoading}
            />
          </div>
          <div className="flex justify-center mt-6 space-x-3">
            <Button type="submit" disabled={isLoading || !query.trim()}>
              {isLoading ? "Thinking..." : "Search"}
            </Button>
            <Button type="button" variant="outline" disabled={isLoading} onClick={() => setQuery("")}>
              Clear
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-8 text-center max-w-md">
        <p className="text-sm text-muted-foreground">
          Try asking: "How does the internet work?" or "Why is the sky blue?" or "What is climate change?"
        </p>
      </div>
    </div>
  )
}
