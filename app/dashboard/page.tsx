"use client"

import { useState, useCallback } from "react"
import { useChat } from "ai/react"
import { ChatHistory } from "@/components/chat-history"
import { ChatInput } from "@/components/chat-input"
import { GoogleSearch } from "@/components/google-search"
import { Button } from "@/components/ui/button"
import { PlusIcon, MoreHorizontal, Share, Download, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"

export default function DashboardPage() {
  const { toast } = useToast()
  const [conversationTitle, setConversationTitle] = useState("New Conversation")
  const [searchError, setSearchError] = useState<string | null>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setMessages, append } = useChat({
    api: "/api/chat",
    onResponse: (response) => {
      // Check if the response is ok
      if (!response.ok) {
        console.error("API response not ok:", response.status, response.statusText)
        setSearchError(`API error: ${response.status} ${response.statusText}`)
        toast({
          title: "Error",
          description: `Failed to get a response from OpenAI: ${response.statusText}`,
          variant: "destructive",
        })
      } else {
        // Clear any previous search errors
        setSearchError(null)
      }
    },
    onError: (err) => {
      console.error("useChat onError:", err)
      setSearchError(err.message)
      toast({
        title: "Error",
        description: "An error occurred while communicating with the AI. Please try again.",
        variant: "destructive",
      })
    },
    onFinish: (message) => {
      // If this is the first user message, set the conversation title
      if (messages.length === 1 && messages[0].role === "user") {
        const userMessage = messages[0].content
        const newTitle = userMessage.length > 30 ? userMessage.substring(0, 30) + "..." : userMessage
        setConversationTitle(newTitle)
      }
    },
  })

  const createNewConversation = useCallback(() => {
    setMessages([])
    setConversationTitle("New Conversation")
    setSearchError(null)
  }, [setMessages])

  const clearConversation = useCallback(() => {
    createNewConversation()
    toast({
      title: "Conversation cleared",
      description: "Your conversation has been cleared.",
    })
  }, [createNewConversation, toast])

  // Determine if we should show the Google-like search interface
  const showGoogleSearch = messages.length === 0

  const handleSearch = useCallback(
    async (query: string) => {
      console.log("handleSearch called with query:", query)

      if (!query.trim() || isLoading) return

      try {
        // Directly use the append method from useChat
        await append({
          role: "user",
          content: query,
        })

        // The title will be updated in the onFinish callback
      } catch (err) {
        console.error("Error in handleSearch:", err)
        setSearchError(err instanceof Error ? err.message : "Unknown error occurred")
        toast({
          title: "Search Failed",
          description: "Failed to process your search. Please try again.",
          variant: "destructive",
        })
      }
    },
    [append, isLoading, toast],
  )

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {!showGoogleSearch && (
        <div className="bg-muted/30 border-b">
          <div className="container mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center">
              <h2 className="text-sm font-medium truncate max-w-[200px] sm:max-w-md">{conversationTitle}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={createNewConversation} variant="ghost" size="sm" className="h-8">
                <PlusIcon className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">New Chat</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Share className="mr-2 h-4 w-4" />
                    <span>Share conversation</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" />
                    <span>Export chat</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={clearConversation} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Clear conversation</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}

      {showGoogleSearch ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <GoogleSearch onSearch={handleSearch} isLoading={isLoading} />
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <ChatHistory messages={messages} isLoading={isLoading} error={error || searchError} />
          <div className="container mx-auto px-4">
            <ChatInput
              input={input}
              handleInputChange={handleInputChange}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}
    </div>
  )
}
