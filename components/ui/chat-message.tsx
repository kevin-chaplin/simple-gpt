import React from 'react'
import { cn } from "@/lib/utils"
import type { Message } from "ai"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { Brain } from "lucide-react"
import { useUser } from "@clerk/nextjs"

interface ChatMessageProps {
  message: Message
  isLoading?: boolean
  className?: string
}

// Use React.memo to prevent unnecessary re-renders
const ChatMessage = React.memo(function ChatMessageInner({ message, isLoading, className }: ChatMessageProps) {
  const isUser = message.role === "user"
  const { user } = useUser()

  // Component for rendering a chat message

  return (
    <div className={cn("flex w-full items-start gap-3", isUser ? "justify-end" : "justify-start", className)}>
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarFallback className="bg-primary/10 text-primary">
            <Brain className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn("max-w-[85%] rounded-lg px-4 py-3", isUser ? "bg-primary text-primary-foreground" : "bg-muted")}
      >
        {isUser ? (
          <p className={cn("text-sm break-words")}>{message.content}</p>
        ) : (
          <div className={cn(isLoading && "animate-pulse")}>
            {/* Check if this is the loading message */}
            {message.id === "loading" ? (
              <p>{message.content}</p>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}
          </div>
        )}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarImage src={user?.imageUrl} alt={user?.username || "User"} />
          <AvatarFallback>
            {user?.firstName?.[0] || user?.username?.[0] || "U"}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  // Only re-render if the message content has changed significantly
  // or if the loading state has changed
  if (prevProps.isLoading !== nextProps.isLoading) {
    return false; // Re-render if loading state changed
  }

  if (prevProps.message.id !== nextProps.message.id) {
    return false; // Re-render if message ID changed
  }

  if (prevProps.message.role !== nextProps.message.role) {
    return false; // Re-render if role changed
  }

  // For assistant messages during streaming, only re-render on significant changes
  if (nextProps.message.role === "assistant" && prevProps.message.content !== nextProps.message.content) {
    // If content length difference is small, skip re-render to prevent infinite loops
    const lengthDiff = Math.abs(prevProps.message.content.length - nextProps.message.content.length);
    return lengthDiff < 10; // Skip re-render for small changes
  }

  return true; // No significant changes, skip re-render
});

// Export the memoized component
export { ChatMessage };
