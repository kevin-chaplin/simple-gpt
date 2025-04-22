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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto py-4 w-full">
      <div className="max-w-4xl mx-auto px-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center min-h-[50vh]">
            <p className="text-center text-muted-foreground">Start a conversation with Simple GPT.</p>
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
              <ChatMessage key={message.id} message={message} />
            ))}

            {isLoading && (
              <ChatMessage message={{ id: "loading", role: "assistant", content: "Thinking..." }} isLoading />
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  )
}
