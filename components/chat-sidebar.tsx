"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  Trash2,
  MessageSquare,
  Edit,
  Check,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { type Conversation, updateAllGenericConversationTitles } from "@/lib/chat-history"
import { useToast } from "@/components/ui/use-toast"

interface ChatSidebarProps {
  conversations: Conversation[]
  currentConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  onDeleteConversation: (id: string) => void
  onRenameConversation: (id: string, title: string) => void
  isLoading?: boolean
}

export function ChatSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  isLoading = false,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [isUpdatingTitles, setIsUpdatingTitles] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conversation) =>
    conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Start editing a conversation title
  const startEditing = (id: string, currentTitle: string) => {
    setEditingId(id)
    setEditTitle(currentTitle)
  }

  // Save the edited title
  const saveTitle = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim())
    }
    setEditingId(null)
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null)
  }

  // Update all generic conversation titles
  const handleUpdateTitles = async () => {
    try {
      setIsUpdatingTitles(true)
      const result = await updateAllGenericConversationTitles()

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
          variant: "default",
        })
        router.refresh()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating titles:", error)
      toast({
        title: "Error",
        description: "Failed to update conversation titles",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingTitles(false)
    }
  }

  return (
    <div className="flex h-full w-full flex-col border-r bg-muted/40">
      <div className="flex items-center p-4">
        <h2 className="text-lg font-semibold">Chat History</h2>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading conversations...</div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
            {searchQuery ? (
              <>
                <div className="text-sm text-muted-foreground">No conversations match your search</div>
                <Button
                  variant="link"
                  className="mt-2 h-auto p-0 text-sm"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              </>
            ) : (
              <div className="text-sm text-muted-foreground text-center px-4">
                <p>No conversations yet</p>
                <p className="mt-1">Start a new chat to begin</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1 py-2">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "group flex items-center justify-between rounded-md px-2 py-2",
                  currentConversationId === conversation.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                )}
              >
                {editingId === conversation.id ? (
                  <div className="flex flex-1 items-center">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-8"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          saveTitle(conversation.id)
                        } else if (e.key === "Escape") {
                          cancelEditing()
                        }
                      }}
                    />
                    <div className="ml-2 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => saveTitle(conversation.id)}
                      >
                        <Check className="h-4 w-4" />
                        <span className="sr-only">Save</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={cancelEditing}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Cancel</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      className="flex-1 truncate text-left text-sm"
                      onClick={() => onSelectConversation(conversation.id)}
                    >
                      <div className="font-medium">
                        {conversation.title || "Untitled Conversation"}
                      </div>
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => startEditing(conversation.id, conversation.title)}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit title</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => onDeleteConversation(conversation.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
