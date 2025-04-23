"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@clerk/nextjs"
import { Message } from "ai"
import {
  getConversations,
  getConversation,
  createConversationWithMessages,
  saveMessages,
  deleteConversation,
  updateConversationTitle,
  type Conversation
} from "@/lib/chat-history"

// No mock data - we'll handle empty states in the UI

export function useChatHistory() {
  const { isSignedIn, isLoaded } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    if (!isSignedIn || !isLoaded) {
      setConversations([])
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getConversations()
        setConversations(data)
      } catch (err) {
        console.error("Error fetching conversations:", err)
        // Set empty array if there's an error
        setConversations([])
      }
    } catch (err) {
      console.error("Error fetching conversations:", err)
      setError("Failed to load conversations")
      // Set empty array if there's an error
      setConversations([])
    } finally {
      setIsLoading(false)
    }
  }, [isSignedIn, isLoaded])

  // Load conversations when the component mounts and the user is signed in
  useEffect(() => {
    if (isSignedIn && isLoaded) {
      fetchConversations()
    }
  }, [isSignedIn, isLoaded, fetchConversations])

  // Load a conversation by ID
  const loadConversation = useCallback(async (id: string) => {
    if (!isSignedIn) return null

    try {
      setIsLoading(true)
      setError(null)
      try {
        const conversation = await getConversation(id)
        setCurrentConversationId(id)
        return conversation?.messages || []
      } catch (err) {
        console.error("Error loading conversation:", err)
        setError("Failed to load conversation")
        return []
      }
    } catch (err) {
      console.error("Error loading conversation:", err)
      setError("Failed to load conversation")
      return null
    } finally {
      setIsLoading(false)
    }
  }, [isSignedIn])

  // Save a new conversation with messages
  const saveConversation = useCallback(async (title: string, messages: Message[]) => {
    console.log("saveConversation called with title:", title, "and messages:", messages.length)
    console.log("Auth state:", { isSignedIn, isLoaded })

    if (!isSignedIn || messages.length === 0) {
      console.log("Not saving conversation: user not signed in or no messages")
      return null
    }

    try {
      setIsLoading(true)
      setError(null)
      try {
        console.log("Calling createConversationWithMessages...")
        const conversation = await createConversationWithMessages(title, messages)
        console.log("Received conversation from createConversationWithMessages:", conversation)

        // CRITICAL FIX: We need to update the conversation ID without losing messages
        // The issue is that when we set the conversation ID, it triggers a re-render
        // which temporarily clears the messages array
        if (conversation && conversation.id) {
          // First, store the ID in localStorage for persistence
          localStorage.setItem('lastConversationId', conversation.id)

          // Then, set a flag in localStorage to indicate we're in an active conversation flow
          localStorage.setItem('inActiveConversationFlow', 'true')
          localStorage.setItem('activeMessages', JSON.stringify(messages))

          // Finally, update the ID
          console.log("Setting currentConversationId to:", conversation.id, "with", messages.length, "messages")
          setCurrentConversationId(conversation.id)
          console.log("Set currentConversationId to:", conversation.id)
        }

        // Create a more complete conversation object with the last_message field
        const assistantMessage = messages.find(m => m.role === 'assistant')?.content || ''
        const enhancedConversation = {
          ...conversation,
          last_message: assistantMessage
        }

        // Update the conversations list without fetching from the server
        // This prevents the UI from flashing
        setConversations(prev => [enhancedConversation, ...prev.filter(c => c.id !== conversation.id)])
        console.log("Updated conversations list locally")

        // Don't fetch in the background immediately - this causes UI flashing
        // We'll rely on the next user interaction to refresh the data if needed
        return conversation
      } catch (err) {
        console.error("Error saving conversation:", err)
        setError("Failed to save conversation")
        return null
      }
    } catch (err) {
      console.error("Error saving conversation:", err)
      setError("Failed to save conversation")
      return null
    } finally {
      setIsLoading(false)
    }
  }, [isSignedIn, fetchConversations])

  // Update an existing conversation with new messages
  const updateConversation = useCallback(async (id: string, messages: Message[]) => {
    if (!isSignedIn || !id || messages.length === 0) return false

    try {
      setIsLoading(true)
      setError(null)
      try {
        // CRITICAL FIX: Log what we're trying to save
        console.log("Updating conversation with new messages:", id, messages.length)

        // Save messages to the database
        await saveMessages(id, messages)

        // Get the assistant message content for the sidebar preview
        const assistantMessage = messages.find(m => m.role === 'assistant')?.content || ''

        // Update the conversation's timestamp and content locally
        setConversations(prev => {
          const updatedConversations = [...prev]
          const index = updatedConversations.findIndex(c => c.id === id)
          if (index !== -1) {
            updatedConversations[index] = {
              ...updatedConversations[index],
              updated_at: new Date().toISOString(),
              last_message: assistantMessage
            }
            // Move the updated conversation to the top
            const [updated] = updatedConversations.splice(index, 1)
            updatedConversations.unshift(updated)
          }
          return updatedConversations
        })

        // Don't fetch in the background immediately - this causes UI flashing
        // We'll rely on the next user interaction to refresh the data if needed

        return true
      } catch (err) {
        console.error("Error updating conversation:", err)
        setError("Failed to update conversation")
        return false
      }
    } catch (err) {
      console.error("Error updating conversation:", err)
      setError("Failed to update conversation")
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSignedIn])

  // Delete a conversation
  const removeConversation = useCallback(async (id: string) => {
    if (!isSignedIn || !id) return false

    try {
      setIsLoading(true)
      setError(null)

      const result = await deleteConversation(id)

      if (!result.success) {
        console.error("Error deleting conversation:", result.message)
        setError(result.message || "Failed to delete conversation")
        return false
      }

      // If we're deleting the current conversation, clear it
      if (currentConversationId === id) {
        setCurrentConversationId(null)
      }

      await fetchConversations() // Refresh the list
      return true
    } catch (err) {
      console.error("Error deleting conversation:", err)
      setError("Failed to delete conversation")
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSignedIn, currentConversationId, fetchConversations])

  // Update a conversation title
  const renameConversation = useCallback(async (id: string, title: string) => {
    if (!isSignedIn || !id || !title) return false

    try {
      setIsLoading(true)
      setError(null)
      try {
        await updateConversationTitle(id, title)
        await fetchConversations() // Refresh the list
        return true
      } catch (err) {
        console.error("Error renaming conversation:", err)
        setError("Failed to rename conversation")
        return false
      }
    } catch (err) {
      console.error("Error renaming conversation:", err)
      setError("Failed to rename conversation")
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSignedIn, fetchConversations])

  return {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    isLoading,
    error,
    fetchConversations,
    loadConversation,
    saveConversation,
    updateConversation,
    removeConversation,
    renameConversation,
  }
}
