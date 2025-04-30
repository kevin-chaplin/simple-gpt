"use client"

import React, { useState, useCallback, useEffect, forwardRef, useImperativeHandle } from "react"
import { useChat } from "ai/react"
import { useUser, useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { ChatHistory } from "@/components/chat-history"
import { ChatInput } from "@/components/chat-input"
import { GoogleSearch } from "@/components/google-search"
import { ChatSidebar } from "@/components/chat-sidebar"
import { Button } from "@/components/ui/button"
import { PlusIcon, PanelLeftIcon, PanelLeftCloseIcon } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { useToast } from "@/components/ui/use-toast"
import { SignUpPrompt } from "@/components/sign-up-prompt"
import { UserProfile } from "@/components/user-profile"
import { User } from "lucide-react"
import { useChatHistory } from "@/lib/use-chat-history"
import { useUsageLimits } from "@/hooks/use-usage-limits"
// UsageLimitToast removed in favor of permanent messages
import {
  hasExceededAnonymousLimit,
  incrementAnonymousRequestCount
} from "@/lib/anonymous-usage"

// Define the ref type
export interface ChatInterfaceRef {
  clearConversation: () => void;
}

export const ChatInterface = forwardRef<ChatInterfaceRef>((_, ref) => {
  const { toast } = useToast()
  const { isLoaded: isUserLoaded } = useUser()
  const { isSignedIn } = useAuth()
  const [conversationTitle, setConversationTitle] = useState("New Conversation")
  const [searchError, setSearchError] = useState<string | null>(null)
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false)

  // Add effect to log when showSignUpPrompt changes
  useEffect(() => {
    console.log('showSignUpPrompt changed:', showSignUpPrompt)
  }, [showSignUpPrompt])

  // Add effect to check anonymous limit on mount
  useEffect(() => {
    // Only run this effect after authentication status is determined
    if (isUserLoaded) {
      if (!isSignedIn && typeof window !== 'undefined') {
        const hasExceeded = hasExceededAnonymousLimit()
        console.log('Initial check for anonymous limit exceeded:', hasExceeded)

        if (hasExceeded) {
          console.log('Setting showSignUpPrompt to true on initial load')
          setShowSignUpPrompt(true)
        }
      }
    }
  }, [isUserLoaded, isSignedIn])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // State to control UI display
  const [interfaceState, setInterfaceState] = useState<'search' | 'chat'>('search')

  // Check if the user is authenticated on the client side
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Initialize router
  const router = useRouter()

  // Usage limits state and functions
  const {
    hasReachedLimit,
    messageLimit,
    timeUntilReset,
    incrementUsage,
    checkUsage,
  } = useUsageLimits()

  // Chat history state and functions
  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    isLoading: isHistoryLoading,
    error: historyError,
    loadConversation,
    saveConversation,
    updateConversation,
    removeConversation,
    renameConversation,
  } = useChatHistory()

  // Debug authentication status
  useEffect(() => {
    console.log("Authentication status changed:", { isUserLoaded, isSignedIn, isAuthenticated })
  }, [isUserLoaded, isSignedIn, isAuthenticated])

  useEffect(() => {
    if (isUserLoaded) {
      console.log("User loaded, setting isAuthenticated to:", !!isSignedIn)
      
      // Remove the debug element creation code
      setIsAuthenticated(!!isSignedIn);
    }
  }, [isUserLoaded, isSignedIn, interfaceState, currentConversationId])

  console.log("Setting up useChat with currentConversationId:", currentConversationId)
  const { messages, input, handleInputChange, isLoading, error, setMessages, append } = useChat({
    api: "/api/chat",
    id: currentConversationId || undefined,
    initialMessages: [],
    onResponse: (response) => {
      // Check if the response is ok
      if (!response.ok) {
        throw new Error(response.statusText)
      }

      // Ensure we're showing the chat interface
      setInterfaceState('chat')
    },
    onFinish: async (message) => {
      console.log("onFinish called with message:", message)
      console.log("Authentication status:", { isAuthenticated, userId: isSignedIn ? 'signed-in' : 'not-signed-in' })
      console.log("Current messages:", messages.length)

      if (!isAuthenticated) {
        console.log("User not authenticated, skipping conversation save")
        return
      }

      console.log("User is authenticated, proceeding with conversation save")

      // CRITICAL FIX: Set the flag to indicate we're in an active conversation flow
      // This prevents the UI from flashing when the conversation ID changes
      inActiveConversationFlow.current = true
      console.log("Setting inActiveConversationFlow to true")

      // Cache the current messages with the current conversation ID if we have one
      if (currentConversationId && messages.length > 0) {
        console.log("Caching messages for existing conversation:", currentConversationId, messages.length)
        messagesCache.current.set(currentConversationId, [...messages])
      }

      // Ensure we're showing the chat interface
      setInterfaceState('chat')

      try {
        // If we have a current conversation, update it with the new messages
        if (currentConversationId) {
          console.log("Updating existing conversation:", currentConversationId)

          // CRITICAL FIX: Save all messages, not just the latest one
          // This ensures all messages are properly saved to the database
          // First, check if the message is already in the database (has an ID with UUID format)
          const isNewMessage = !message.id || !message.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

          if (isNewMessage) {
            console.log("Saving new message to database:", message)

            // CRITICAL FIX: We've already saved the user message in customSubmitHandler
            // Now we just need to save the assistant message
            console.log("Saving assistant message to database:", message);

            // Just save the assistant message
            const result = await updateConversation(currentConversationId, [message]);
            console.log("Update conversation with assistant message result:", result);

            // Update the local cache with all messages
            const updatedMessages = [...messages];
            messagesCache.current.set(currentConversationId, updatedMessages);
            localStorage.setItem(`messages_${currentConversationId}`, JSON.stringify(updatedMessages));
          } else {
            console.log("Message already exists in database, skipping save:", message.id)
          }
        }
        // For new conversations, we need to manually find the user message
        else {
          // Find the last user message in the messages array
          const userMessage = messages.find(m => m.role === 'user')

          if (userMessage) {
            console.log("Found user message:", userMessage)
            // Create a new conversation with the user message and assistant message
            const title = userMessage.content.length > 30
              ? userMessage.content.substring(0, 30) + "..."
              : userMessage.content

            console.log("Saving new conversation with title:", title)
            console.log("Messages to save:", [...messages, message])

            try {
              // Save the conversation but don't trigger a UI refresh
              const result = await saveConversation(title, [...messages, message])
              console.log("Save conversation result:", result)
              if (result) {
                console.log("Conversation saved successfully with ID:", result.id)
              } else {
                console.error("Failed to save conversation: result is null or undefined")
              }
            } catch (saveError) {
              console.error("Error saving conversation:", saveError)
            }
          } else {
            // If we can't find a user message in the messages array, check the input history
            console.log("No user message found in messages array, checking input history")

            // Get the last input from localStorage if available
            const lastInput = localStorage.getItem('lastUserInput')
            console.log("Last user input from localStorage:", lastInput)

            // Create a title from the assistant message
            const title = lastInput && lastInput.length > 0 ?
              (lastInput.length > 30 ? lastInput.substring(0, 30) + "..." : lastInput) :
              "New Conversation"

            // Create a user message with the actual input if available
            const userMessage = {
              id: `user-${Date.now()}`,
              role: "user" as const, // Type assertion to fix TypeScript error
              content: lastInput || "New conversation",
              createdAt: new Date()
            }

            try {
              // Save the conversation but don't trigger a UI refresh
              const result = await saveConversation(title, [userMessage, message])
              console.log("Save conversation result with recovered user message:", result)
            } catch (saveError) {
              console.error("Error saving conversation with recovered user message:", saveError)
            }
          }
        }
      } catch (err) {
        console.error("Error saving conversation:", err)
      }
    },
    onError: (error) => {
      console.error("Error in chat:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      })
    },
  })

  // CRITICAL FIX: Only force chat interface when we have messages and we're not in a new conversation flow
  useEffect(() => {
    // Only switch to chat interface if we have messages AND we're not in a new conversation flow
    // This prevents the UI from switching to chat mode when we want to show the search interface
    if (messages.length > 0 && !inActiveConversationFlow.current && currentConversationId) {
      setInterfaceState('chat')
    }
  }, [messages.length, currentConversationId])

  // Check if we should show the chat interface on initial load
  useEffect(() => {
    // If we have a conversation ID in the URL or localStorage, show the chat interface
    const hasConversationId = window.location.search.includes('conversationId=') ||
                             localStorage.getItem('lastConversationId') !== null

    // If we have messages, a conversation ID, or a stored conversation ID, show the chat interface
    if (hasConversationId || messages.length > 0 || currentConversationId) {
      setInterfaceState('chat')
    }
  }, [])

  // CRITICAL FIX: Maintain a single source of truth for messages
  // We're using a ref to track if we're currently in a conversation flow
  const inActiveConversationFlow = React.useRef(false)

  // We also need to keep a copy of the messages to prevent UI flashing
  // We'll use a Map to store messages by conversation ID
  const messagesCache = React.useRef<Map<string, any[]>>(new Map())

  // Update the cache whenever messages change and we have a current conversation ID
  useEffect(() => {
    if (messages.length > 0 && currentConversationId) {
      console.log("Caching messages for conversation:", currentConversationId, messages.length)
      messagesCache.current.set(currentConversationId, [...messages])
    }
  }, [messages, currentConversationId])

  // This effect is now only used for initial loading and recovery
  // Most conversation switching is handled by handleSelectConversation
  useEffect(() => {
    if (currentConversationId && isAuthenticated) {
      // Ensure we're showing the chat interface
      setInterfaceState('chat')

      // CRITICAL FIX: Check if we're in an active conversation flow using localStorage
      const inActiveFlow = localStorage.getItem('inActiveConversationFlow') === 'true'

      if (inActiveFlow) {
        console.log("In active conversation flow, restoring messages from localStorage")

        try {
          // Get the active messages from localStorage
          const activeMessagesJson = localStorage.getItem('activeMessages')

          if (activeMessagesJson) {
            const activeMessages = JSON.parse(activeMessagesJson)

            if (activeMessages && activeMessages.length > 0) {
              console.log("Restoring", activeMessages.length, "messages from localStorage")
              setMessages(activeMessages)

              // Clear the localStorage flags
              localStorage.removeItem('inActiveConversationFlow')
              localStorage.removeItem('activeMessages')

              // Also update the cache
              messagesCache.current.set(currentConversationId, [...activeMessages])

              // Skip the rest of the effect
              return
            }
          }
        } catch (error) {
          console.error("Error restoring messages from localStorage:", error)
        }

        // Clear the localStorage flags
        localStorage.removeItem('inActiveConversationFlow')
        localStorage.removeItem('activeMessages')
      }

      // Check if we have messages in memory or in cache
      if (messages.length === 0) {
        // Check if we have cached messages for this conversation
        const cachedMessages = messagesCache.current.get(currentConversationId)

        if (cachedMessages && cachedMessages.length > 0) {
          // If we have cached messages, use them
          console.log("Restoring messages from cache for conversation:", currentConversationId, cachedMessages.length)
          setMessages(cachedMessages)
        } else {
          // If we don't have cached messages, load from database
          console.log("No messages in memory or cache, loading from database for conversation:", currentConversationId)
          const loadConversationData = async () => {
            const conversationMessages = await loadConversation(currentConversationId)
            if (conversationMessages && conversationMessages.length > 0) {
              console.log("Loaded messages from database:", conversationMessages.length)
              setMessages(conversationMessages)
              // Also cache these messages
              messagesCache.current.set(currentConversationId, [...conversationMessages])
            } else {
              console.log("No messages found in database for conversation:", currentConversationId)
              setMessages([])
            }
          }

          loadConversationData()
        }
      } else {
        console.log("Messages already in memory, skipping database load")
      }

      // Always update the conversation title
      const conversation = conversations.find(c => c.id === currentConversationId)
      if (conversation) {
        setConversationTitle(conversation.title)
      }
    }
  }, [currentConversationId, isAuthenticated, loadConversation, setMessages, conversations, messages.length])

  // Update conversation title when messages change
  useEffect(() => {
    // Only update the title if we have messages and the title is still the default
    // and we don't have a current conversation (new conversation)
    if (!currentConversationId && messages.length > 0 && messages[0].role === "user" && conversationTitle === "New Conversation") {
      const userMessage = messages[0].content
      const newTitle = userMessage.length > 30 ? userMessage.substring(0, 30) + "..." : userMessage
      setConversationTitle(newTitle)
    }

    // If we have messages, ensure we're showing the chat interface
    if (messages.length > 0) {
      setInterfaceState('chat')
    }
  }, [messages, conversationTitle, currentConversationId])

  // Create a new conversation
  const createNewConversation = useCallback(() => {
    console.log("Creating new conversation")

    // Cache the current messages with the current conversation ID if we have one
    if (currentConversationId && messages.length > 0) {
      console.log("Caching messages before creating new conversation:", currentConversationId, messages.length)
      messagesCache.current.set(currentConversationId, [...messages])
    }

    // Clear the conversation ID first
    setCurrentConversationId(null)

    // Then clear the messages
    setMessages([])

    // Reset the title and error state
    setConversationTitle("New Conversation")
    setSearchError(null)

    // CRITICAL FIX: Always show search interface for new conversations
    // This ensures the Google-like search view is shown on the first click
    // Force the interface state to search mode
    setInterfaceState('search')

    // Add a small delay to ensure the state is updated
    setTimeout(() => {
      if (messages.length === 0 && !currentConversationId) {
        setInterfaceState('search')
      }
    }, 50)

    // Clear the lastConversationId from localStorage
    localStorage.removeItem('lastConversationId')

    // Reset the active conversation flow flag
    inActiveConversationFlow.current = false

    // Scroll to the top of the page to ensure the search view is visible
    window.scrollTo(0, 0)
  }, [setMessages, setCurrentConversationId, setConversationTitle, setSearchError, currentConversationId, messages])

  // Clear the current conversation
  const clearConversation = useCallback(() => {
    createNewConversation()
    toast({
      title: "Conversation cleared",
      description: "Your conversation has been cleared.",
    })
  }, [createNewConversation, toast])

  // Handle selecting a conversation from the sidebar
  const handleSelectConversation = useCallback(async (id: string) => {
    console.log("Selecting conversation:", id)

    // Skip if we're already on this conversation
    if (id === currentConversationId) {
      console.log("Already on this conversation, skipping")
      return
    }

    // First set the interface state to chat to ensure we're showing the chat interface
    setInterfaceState('chat')

    // CRITICAL FIX: Load the conversation messages directly instead of relying on the useEffect
    try {
      // Show a loading toast
      toast({
        title: "Loading conversation",
        description: "Please wait...",
        duration: 1000, // Auto-dismiss after 1 second
      })

      // If we have the current conversation ID and messages, cache them before switching
      if (currentConversationId && messages.length > 0) {
        console.log("Caching current conversation before switching:", currentConversationId, messages.length)
        messagesCache.current.set(currentConversationId, [...messages])

        // Also store in localStorage as a backup
        localStorage.setItem(`messages_${currentConversationId}`, JSON.stringify(messages))
      }

      // CRITICAL FIX: Clear the messages first to prevent UI flashing
      // This ensures we don't see the old messages while loading the new ones
      setMessages([])

      // CRITICAL FIX: Set the conversation ID before loading messages
      // This ensures we're in the right context when loading messages
      setCurrentConversationId(id)

      // Update the conversation title
      const conversation = conversations.find(c => c.id === id)
      if (conversation) {
        setConversationTitle(conversation.title)
      }

      // Store the conversation ID in localStorage
      localStorage.setItem('lastConversationId', id)

      // Load the conversation messages from the database
      // This is the most reliable source of truth
      console.log("Loading messages from database for conversation:", id)
      const conversationMessages = await loadConversation(id)

      // Set the messages directly
      if (conversationMessages && conversationMessages.length > 0) {
        console.log("Loaded messages for conversation from database:", id, conversationMessages.length)
        setMessages(conversationMessages)
        // Also update the cache
        messagesCache.current.set(id, [...conversationMessages])
        // And store in localStorage
        localStorage.setItem(`messages_${id}`, JSON.stringify(conversationMessages))
      } else {
        console.log("No messages found for conversation:", id)
        setMessages([])
      }
    } catch (error) {
      console.error("Error loading conversation:", error)
      toast({
        title: "Error",
        description: "Failed to load conversation.",
        variant: "destructive",
      })
    }
  }, [setCurrentConversationId, setMessages, loadConversation, conversations, setConversationTitle, toast, currentConversationId, messages])

  // Handle deleting a conversation
  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await removeConversation(id)

      if (id === currentConversationId) {
        createNewConversation()
      }

      toast({
        title: "Conversation deleted",
        description: "The conversation has been deleted.",
      })
    } catch (err) {
      console.error("Error deleting conversation:", err)
      toast({
        title: "Error",
        description: "Failed to delete conversation.",
        variant: "destructive",
      })
    }
  }, [removeConversation, currentConversationId, createNewConversation, toast])

  // Handle renaming a conversation
  const handleRenameConversation = useCallback(async (id: string, title: string) => {
    try {
      await renameConversation(id, title)

      if (id === currentConversationId) {
        setConversationTitle(title)
      }

      toast({
        title: "Conversation renamed",
        description: "The conversation has been renamed.",
      })
    } catch (err) {
      console.error("Error renaming conversation:", err)
      toast({
        title: "Error",
        description: "Failed to rename conversation.",
        variant: "destructive",
      })
    }
  }, [renameConversation, currentConversationId, toast])

  // Expose the clearConversation method via ref
  useImperativeHandle(ref, () => ({
    clearConversation
  }))

  // Custom submit handler that checks for anonymous usage limits
  const customSubmitHandler = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      // Store the current input value for debugging
      const currentInputValue = input
      console.log("Submitting message:", currentInputValue)

      // Skip if the input is empty or we're already loading
      if (!currentInputValue.trim() || isLoading) {
        return
      }

      // Store the user's input in localStorage for recovery if needed
      localStorage.setItem('lastUserInput', currentInputValue)

      // If the user is not authenticated, check if they've exceeded the anonymous limit
      if (isUserLoaded && !isSignedIn) {
        const hasExceeded = hasExceededAnonymousLimit()
        console.log('Checking if anonymous user has exceeded limit:', hasExceeded)

        if (hasExceeded) {
          console.log('Anonymous user has exceeded limit, showing sign-up prompt')
          setShowSignUpPrompt(true)
          return
        }
      }

      // If authenticated, check if they've reached their subscription limit
      if (isAuthenticated) {
        // Always check usage first to ensure we have the latest data
        await checkUsage()

        // Check again after refreshing the data
        if (hasReachedLimit) {
          // Just return without submitting - the UI will show the limit message
          return
        }
      }

      // If not authenticated, increment the anonymous request count
      if (isUserLoaded && !isSignedIn) {
        console.log('User is not authenticated, incrementing anonymous request count')
        const newCount = incrementAnonymousRequestCount()
        console.log('New anonymous request count:', newCount)

        // Check if the user has now exceeded the limit
        const hasExceeded = hasExceededAnonymousLimit()
        console.log('Has exceeded anonymous limit after increment:', hasExceeded)
      }

      // If authenticated, increment the usage count
      if (isAuthenticated) {
        incrementUsage()
      }

      // CRITICAL FIX: Use the append method directly instead of handleSubmit
      // This ensures the user message is properly added to the conversation
      try {
        // Ensure we're showing the chat interface
        setInterfaceState('chat')

        // Create a unique ID for this message to track it
        const messageId = `user-${Date.now()}`
        console.log("Adding user message with ID:", messageId)

        // Create the user message object
        const userMessage = {
          id: messageId,
          role: "user" as const,
          content: currentInputValue,
        }

        // Use the append method to add the user message
        append(userMessage)

        // CRITICAL FIX: Save the user message to the database immediately
        // This ensures the user message is saved even if the assistant response fails
        if (isAuthenticated && currentConversationId) {
          console.log("Saving user message to database immediately:", userMessage)
          try {
            const result = await updateConversation(currentConversationId, [userMessage])
            console.log("Saved user message to database:", result)
          } catch (saveError) {
            console.error("Error saving user message to database:", saveError)
          }
        }

        // CRITICAL FIX: Clear the input field after submission
        // We need to use a setTimeout to ensure the input is cleared after the message is sent
        // This prevents the input from being cleared before the message is sent
        setTimeout(() => {
          const textarea = document.querySelector('textarea') as HTMLTextAreaElement
          if (textarea) {
            textarea.value = ''
            // Trigger a change event to update the React state
            const event = new Event('input', { bubbles: true })
            textarea.dispatchEvent(event)
          }
        }, 0)
      } catch (err) {
        console.error("Error adding user message:", err)
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        })
      }
    },
    [append, isLoading, toast, isAuthenticated, input, currentConversationId, updateConversation, hasReachedLimit, messageLimit, timeUntilReset, incrementUsage, checkUsage, router]
  )

  // Handle search queries from the Google-like search interface
  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim() || isLoading) {
        return
      }

      console.log("Search query:", query)

      // Store the search query in localStorage for recovery if needed
      localStorage.setItem('lastUserInput', query)

      // If the user is not authenticated, check if they've exceeded the anonymous limit
      if (isUserLoaded && !isSignedIn) {
        const hasExceeded = hasExceededAnonymousLimit()
        console.log('Search: Checking if anonymous user has exceeded limit:', hasExceeded)

        if (hasExceeded) {
          console.log('Search: Anonymous user has exceeded limit, showing sign-up prompt')
          setShowSignUpPrompt(true)
          return
        }
      }

      // If authenticated, check if they've reached their subscription limit
      if (isAuthenticated) {
        // Always check usage first to ensure we have the latest data
        await checkUsage()

        // Check again after refreshing the data
        if (hasReachedLimit) {
          // Just return without submitting - the UI will show the limit message
          return
        }
      }

      try {
        // If not authenticated, increment the anonymous request count
        if (isUserLoaded && !isSignedIn) {
          console.log('Search: User is not authenticated, incrementing anonymous request count')
          const newCount = incrementAnonymousRequestCount()
          console.log('Search: New anonymous request count:', newCount)

          // Check if the user has now exceeded the limit
          const hasExceeded = hasExceededAnonymousLimit()
          console.log('Search: Has exceeded anonymous limit after increment:', hasExceeded)
        }

        // If authenticated, increment the usage count
        if (isAuthenticated) {
          incrementUsage()
        }

        // CRITICAL FIX: First ensure we're showing the chat interface
        // This ensures the user sees their message immediately
        setInterfaceState('chat')

        // Create a unique ID for this message to track it
        const messageId = `user-${Date.now()}`
        console.log("Adding search query as user message with ID:", messageId)

        // Create the user message object
        const userMessage = {
          id: messageId,
          role: "user" as const,
          content: query,
        }

        // Use the append method to add the user message
        append(userMessage)

        // CRITICAL FIX: Save the user message to the database immediately
        // This ensures the user message is saved even if the assistant response fails
        if (isAuthenticated && currentConversationId) {
          console.log("Saving search query to database immediately:", userMessage)
          try {
            const result = await updateConversation(currentConversationId, [userMessage])
            console.log("Saved search query to database:", result)
          } catch (saveError) {
            console.error("Error saving search query to database:", saveError)
          }
        }

        // Note: We don't need to clear the search input field here
        // The GoogleSearch component already clears the input in its handleSubmit function
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
    [append, isLoading, toast, isAuthenticated, currentConversationId, updateConversation, hasReachedLimit, messageLimit, timeUntilReset, incrementUsage, checkUsage, router]
  )

  // We'll handle this in useEffect instead to avoid infinite loops

  // CRITICAL FIX: Show the Google search interface if we're in search mode OR if we have no messages
  // This ensures the Google-like search view is shown on the first click of a new chat
  // and when starting a new conversation
  const showGoogleSearch = interfaceState === 'search' || (messages.length === 0 && !currentConversationId)

  // Debug log to track UI state
  console.log('UI State:', {
    interfaceState,
    messagesLength: messages.length,
    currentConversationId,
    showGoogleSearch,
    inActiveConversationFlow: inActiveConversationFlow.current
  })

  return (
    <div className="flex h-screen overflow-hidden flex-col md:flex-row">
      {/* Chat history sidebar - modified for better mobile handling */}
      {isAuthenticated && (
        <div className={`fixed md:relative z-40 md:z-auto border-r bg-background
                        ${sidebarOpen ? 'w-full md:w-80 opacity-100' : 'w-0 opacity-0'} 
                        transition-all duration-300 overflow-hidden h-screen pt-16`}>
          {sidebarOpen && (
            <div className="flex flex-col h-full">
              {/* Add semi-transparent overlay on mobile only to indicate sidebar is modal */}
              <div className="md:hidden fixed inset-0 bg-black/20 z-10" 
                   onClick={() => setSidebarOpen(false)}></div>
              
              {/* Chat sidebar with conversations */}
              <div className="flex-1 overflow-y-auto relative z-20 bg-background">
                <ChatSidebar
                  conversations={conversations}
                  currentConversationId={currentConversationId}
                  onSelectConversation={(id) => {
                    handleSelectConversation(id);
                    // Auto-close sidebar on mobile after selection
                    if (window.innerWidth < 768) {
                      setSidebarOpen(false);
                    }
                  }}
                  onNewConversation={() => {
                    createNewConversation();
                    // Auto-close sidebar on mobile after creating new conversation
                    if (window.innerWidth < 768) {
                      setSidebarOpen(false);
                    }
                  }}
                  onDeleteConversation={handleDeleteConversation}
                  onRenameConversation={handleRenameConversation}
                  isLoading={isHistoryLoading}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Usage limit toast component removed in favor of permanent messages */}

      {/* Main chat area - modified to ensure content is visible regardless of sidebar state */}
      <div className="flex-1 relative flex flex-col h-screen">
        {/* Floating controls in top-right corner */}
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2" style={{ border: 'none', boxShadow: 'none' }}>
          {/* Theme toggle */}
          <ThemeToggle />

          {/* User account controls - only shown when authenticated */}
          {isAuthenticated ? (
            <>
              {/* Use the proper Clerk UserProfile component */}
              <UserProfile />
            </>
          ) : (
            /* Sign in button for non-authenticated users */
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm border-0"
              onClick={() => window.location.href = '/sign-in'}
            >
              <User className="h-4 w-4 mr-1" />
              <span className="sr-only sm:not-sr-only">Sign In</span>
            </Button>
          )}

          {/* Chat-specific controls - only shown when not in Google search mode */}
          {!showGoogleSearch && (
            <>
              <Button
                onClick={createNewConversation}
                variant="ghost"
                size="sm"
                className="h-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm border-0"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                <span className="sr-only sm:not-sr-only">New Chat</span>
              </Button>
            </>
          )}
        </div>

        {/* Sidebar toggle - floating in top-left */}
        {isAuthenticated && (
          <div className="fixed top-4 left-4 z-50">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ?
                <PanelLeftCloseIcon className="h-4 w-4" /> :
                <PanelLeftIcon className="h-4 w-4" />}
              <span className="sr-only">
                {sidebarOpen ? "Close sidebar" : "Open sidebar"}
              </span>
            </Button>
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 overflow-y-auto pt-16 w-full md:h-auto h-[calc(100vh-4rem)]">
          {showGoogleSearch ? (
            <div className="flex flex-col justify-start items-center w-full px-4 pb-8 md:pb-16" 
                 style={{ 
                   paddingTop: 'min(10vh, 40px)', /* Reduced for small screens */
                   minHeight: '75vh',
                   position: 'relative',
                   zIndex: 5
                 }}>
              <GoogleSearch onSearch={handleSearch} error={searchError || null} />
            </div>
          ) : (
            <ChatHistory messages={messages} isLoading={isLoading} error={null} />
          )}
        </div>

        {/* Sign up prompt - always render it when needed, regardless of other UI state */}
        {showSignUpPrompt && (
          <SignUpPrompt
            open={showSignUpPrompt}
            onClose={() => {
              console.log('SignUpPrompt onClose called')
              setShowSignUpPrompt(false)
            }}
          />
        )}

        {/* Input section at the bottom - sticky to ensure it stays at the bottom */}
        {!showGoogleSearch && (
          <div className="sticky bottom-0 p-4 mx-auto max-w-4xl w-full bg-background/80 backdrop-blur-sm z-10 mt-auto mb-0">
            <ChatInput
              input={input}
              handleInputChange={handleInputChange}
              handleSubmit={customSubmitHandler}
              isLoading={isLoading}
              showGoogleSearch={showGoogleSearch}
            />
          </div>
        )}
      </div>
    </div>
  )
})

ChatInterface.displayName = "ChatInterface"