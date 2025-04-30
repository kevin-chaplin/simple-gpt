"use client"

import { useEffect, useRef } from "react"
import type { Message } from "ai"
import { ChatMessage } from "@/components/ui/chat-message"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ChatHistoryProps {
  messages: Message[]
  isLoading: boolean
  error: Error | string | null
}

export function ChatHistory({ messages, isLoading, error }: ChatHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // CRITICAL FIX: Only scroll when messages are added, not during streaming
  // This prevents the scroll position from jumping during streaming
  const messagesLengthRef = useRef(messages.length)

  // CRITICAL FIX: Always scroll when messages change or loading state changes
  // This ensures we always scroll to the bottom when new messages are added
  useEffect(() => {
    // Always scroll to bottom for a better user experience
    // Use a small timeout to ensure the DOM has updated
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)

    // Update the ref for next comparison
    messagesLengthRef.current = messages.length
  }, [messages, isLoading])

  // Only show the "Thinking..." message when we're waiting for the first response
  // Check if we have any assistant messages in the current conversation
  const hasAssistantMessage = messages.some(message => message.role === "assistant");

  // Only show thinking when loading AND we don't have any assistant messages yet
  const showThinking = isLoading && !hasAssistantMessage;

  return (
    <div className="flex-1 py-4 w-full">
      <div className="max-w-4xl mx-auto px-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center min-h-[50vh]">
            <p className="text-center text-muted-foreground">Start a conversation with Sensible GPT.</p>
          </div>
        ) : (
          <div className="space-y-6 w-full">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {typeof error === "string"
                    ? error
                    : error instanceof Error
                      ? error.message
                      : "An error occurred. Please try again or refresh the page."}
                </AlertDescription>
              </Alert>
            )}

            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isLoading={isLoading && message.role === "assistant" && message.id === messages[messages.length - 1].id}
              />
            ))}

            {showThinking && (
              <ChatMessage message={{ id: "loading", role: "assistant", content: "Thinking..." }} isLoading />
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  )
}
