import { cn } from "@/lib/utils"
import type { Message } from "ai"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MarkdownRenderer } from "@/components/markdown-renderer"

interface ChatMessageProps {
  message: Message
  isLoading?: boolean
}

export function ChatMessage({ message, isLoading }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex w-full items-start gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarImage src="/abstract-ai-network.png" alt="Simple GPT" />
          <AvatarFallback className="bg-primary/10 text-primary">AI</AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn("max-w-[85%] rounded-lg px-4 py-3", isUser ? "bg-primary text-primary-foreground" : "bg-muted")}
      >
        {isUser ? (
          <p className={cn("text-sm break-words", isLoading && "animate-pulse")}>{message.content}</p>
        ) : (
          <div className={cn(isLoading && "animate-pulse")}>
            <MarkdownRenderer content={message.content} />
          </div>
        )}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
