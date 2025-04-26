"use client"

import React from "react"
import { SendIcon, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useUsageLimits } from "@/hooks/use-usage-limits"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"

interface ChatInputProps {
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  showGoogleSearch?: boolean
}

export function ChatInput({ input, handleInputChange, handleSubmit, isLoading }: ChatInputProps) {
  const { toast } = useToast()
  const router = useRouter()
  const { hasReachedLimit, messageLimit, timeUntilReset, checkUsage } = useUsageLimits()

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!input.trim()) {
      toast({
        title: "Empty message",
        description: "Please enter a message before sending.",
        variant: "destructive",
      })
      return
    }

    try {
      console.log("Submitting chat input:", input)
      handleSubmit(e)
    } catch (error) {
      console.error("Error in ChatInput onSubmit:", error)
      toast({
        title: "Error",
        description: "Failed to send your message. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const form = e.currentTarget.form
      if (form) form.requestSubmit()
    }
  }

  // Check usage only once when component renders
  React.useEffect(() => {
    const checkCurrentUsage = async () => {
      try {
        await checkUsage()
      } catch (error) {
        console.error("ChatInput: Error checking usage:", error)
      }
    }

    // Check immediately on mount
    checkCurrentUsage()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <form onSubmit={onSubmit} className="py-4 w-full max-w-4xl mx-auto">
      {hasReachedLimit && (
        <div className="mb-3 sm:mb-4 p-3 sm:p-4 border-2 border-destructive bg-destructive/10 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1 sm:mb-2">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
            <h3 className="font-bold text-destructive text-sm sm:text-base">Daily Limit Reached</h3>
          </div>
          <p className="mb-2 sm:mb-3 text-xs sm:text-sm">You've reached your daily limit of <strong>{messageLimit} messages</strong>. Your limit will reset in <strong>{timeUntilReset}</strong>.</p>
          <Button
            variant="default"
            size="sm"
            className="bg-destructive hover:bg-destructive/90 text-xs sm:text-sm py-1 px-3 h-auto"
            onClick={() => router.push("/pricing")}
          >
            Upgrade Your Plan
          </Button>
        </div>
      )}

      <div className="flex items-end gap-1 sm:gap-2 bg-background border rounded-lg p-1 sm:p-2 shadow-sm">
        <Textarea
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={hasReachedLimit ? "Daily limit reached." : "Ask anything..."}
          className="min-h-[36px] sm:min-h-[40px] border-0 focus-visible:ring-0 resize-none flex-1 py-1 sm:py-2 px-1 sm:px-2 text-sm sm:text-base"
          disabled={isLoading || hasReachedLimit}
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !input.trim() || hasReachedLimit}
          className="h-7 w-7 sm:h-8 sm:w-8"
        >
          <SendIcon className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
      <div className="text-xs text-center mt-2 text-muted-foreground">
        I'll explain everything in sensible, easy-to-understand terms.
      </div>
    </form>
  )
}
