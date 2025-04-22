"use client"

import type React from "react"
import { SendIcon, Paperclip, Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

interface ChatInputProps {
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading: boolean
}

export function ChatInput({ input, handleInputChange, handleSubmit, isLoading }: ChatInputProps) {
  const { toast } = useToast()

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

  return (
    <form onSubmit={onSubmit} className="py-4 w-full max-w-4xl mx-auto">
      <div className="flex items-end gap-2 bg-background border rounded-lg p-2 shadow-sm">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          disabled={isLoading}
        >
          <Paperclip className="h-4 w-4" />
          <span className="sr-only">Attach file</span>
        </Button>
        <Textarea
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything in simple terms..."
          className="min-h-[40px] border-0 focus-visible:ring-0 resize-none flex-1 py-2 px-2"
          disabled={isLoading}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          disabled={isLoading}
        >
          <Mic className="h-4 w-4" />
          <span className="sr-only">Voice input</span>
        </Button>
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="h-8 w-8">
          <SendIcon className="h-4 w-4" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
      <div className="text-xs text-center mt-2 text-muted-foreground">
        I'll explain everything in simple, easy-to-understand terms.
      </div>
    </form>
  )
}
