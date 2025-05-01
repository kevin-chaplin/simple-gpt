"use server"

import { auth } from "@clerk/nextjs/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { Message } from "ai"

export interface Conversation {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
  last_message?: string
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[]
}

// No mock data - we'll handle empty states in the UI

/**
 * Get all conversations for the current user
 */
export async function getConversations(): Promise<Conversation[]> {
  const authResult = await auth()
  console.log("Auth result:", authResult)
  const { userId } = authResult

  if (!userId) {
    console.log("User not authenticated, returning empty conversations list")
    return []
  }

  try {
    console.log("Creating Supabase client for user:", userId)
    const supabase = await createServerSupabaseClient()

    // Get all conversations for the user, ordered by most recently updated
    console.log("Fetching conversations from Supabase")
    const { data, error } = await supabase
      .from("conversations")
      .select(`
        id,
        user_id,
        title,
        created_at,
        updated_at
      `)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Error fetching conversations:", error)
      throw new Error("Failed to fetch conversations")
    }

    console.log("Successfully fetched conversations:", data?.length || 0)

    // For each conversation, get the last message (both user and assistant)
    const conversationsWithLastMessage = await Promise.all(
      data.map(async (conversation) => {
        // First try to get the last user message
        const { data: userMessages, error: userMessagesError } = await supabase
          .from("messages")
          .select("content, role, created_at")
          .eq("conversation_id", conversation.id)
          .eq("role", "user")
          .order("created_at", { ascending: false })
          .limit(1)

        // Then try to get the last assistant message
        const { data: assistantMessages, error: assistantMessagesError } = await supabase
          .from("messages")
          .select("content, role, created_at")
          .eq("conversation_id", conversation.id)
          .eq("role", "assistant")
          .order("created_at", { ascending: false })
          .limit(1)

        if (userMessagesError) {
          console.error("Error fetching last user message:", userMessagesError)
        }

        if (assistantMessagesError) {
          console.error("Error fetching last assistant message:", assistantMessagesError)
        }

        // Determine which message to use for the preview (prefer assistant message)
        let lastMessage = ""
        if (assistantMessages && assistantMessages.length > 0) {
          // Extract the assistant's response, skipping any title/header
          const assistantContent = assistantMessages[0].content

          // Remove markdown headers and the question being repeated
          const cleanedContent = assistantContent
            .replace(/^\*\*[^*]+\*\*\n+/, '') // Remove markdown header
            .replace(/^#+\s+.+\n+/, '')      // Remove # headers
            .replace(/^The\s+sky\s+is\s+blue\s+because.+\n+/i, '') // Remove question repetition
            .replace(/^.+\s+is\s+blue\s+because.+\n+/i, '')     // More generic pattern
            .trim()

          // Use the cleaned content or fall back to the original if cleaning removed everything
          lastMessage = cleanedContent || assistantContent
        } else if (userMessages && userMessages.length > 0) {
          lastMessage = userMessages[0].content
        }

        return {
          ...conversation,
          last_message: lastMessage,
        }
      })
    )

    return conversationsWithLastMessage
  } catch (err) {
    console.error("Error with Supabase:", err)
    // Return empty array if Supabase is not available
    return []
  }
}

/**
 * Get a conversation by ID with all its messages
 */
export async function getConversation(id: string): Promise<ConversationWithMessages | null> {
  const { userId } = await auth()

  if (!userId) {
    console.log("User not authenticated, returning null for conversation")
    return null
  }

  try {
    const supabase = await createServerSupabaseClient()

    // Get the conversation
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single()

    if (conversationError) {
      if (conversationError.code === "PGRST116") {
        // Record not found
        return null
      }
      console.error("Error fetching conversation:", conversationError)
      throw new Error("Failed to fetch conversation")
    }

    // Get all messages for the conversation
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })

    if (messagesError) {
      console.error("Error fetching messages:", messagesError)
      throw new Error("Failed to fetch messages")
    }

    // Format messages to match the AI SDK Message type
    const formattedMessages: Message[] = messages.map((message) => ({
      id: message.id,
      role: message.role as "user" | "assistant" | "system",
      content: message.content,
    }))

    return {
      ...conversation,
      messages: formattedMessages,
    }
  } catch (err) {
    console.error("Error with Supabase:", err)
    // Return null if Supabase is not available
    return null
  }
}

/**
 * Create a new conversation
 */
export async function createConversation(title: string = "New Conversation"): Promise<Conversation> {
  const { userId } = await auth()

  if (!userId) {
    console.log("User not authenticated, cannot create conversation")
    throw new Error("User not authenticated")
  }

  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("conversations")
      .insert([
        {
          user_id: userId,
          title,
        },
      ])
      .select()

    if (error) {
      console.error("Error creating conversation:", error)
      throw new Error("Failed to create conversation")
    }

    revalidatePath("/")

    return data[0]
  } catch (err) {
    console.error("Error with Supabase:", err)
    throw new Error("Failed to create conversation")
  }
}

/**
 * Generate a better title from a message
 */
export async function generateTitleFromMessage(message: string): Promise<string> {
  const content = message.trim()

  // Check for question patterns
  if (content.match(/^(why|what|how|when|where|who|can|could|would|should|is|are|do|does|did|will|has|have)\s/i)) {
    // It's likely a question, use the first sentence or up to 50 chars
    const endOfQuestion = Math.min(
      content.indexOf("?") > 0 ? content.indexOf("?") + 1 : content.length,
      content.indexOf(".") > 0 ? content.indexOf(".") : content.length,
      content.indexOf("\n") > 0 ? content.indexOf("\n") : content.length,
      50
    )
    return content.substring(0, endOfQuestion)
  } else {
    // Not a question, extract a topic
    // Look for phrases like "Tell me about X" or "Explain X"
    const tellMeAboutMatch = content.match(/(?:tell me about|explain|describe|what is|who is|how does)\s+([^?.]+)/i)
    if (tellMeAboutMatch && tellMeAboutMatch[1]) {
      let title = tellMeAboutMatch[1].trim()
      // Capitalize first letter
      title = title.charAt(0).toUpperCase() + title.slice(1)
      // Add a question mark for question-like titles
      if (content.indexOf("?") > 0) {
        title += "?"
      }
      return title
    } else {
      // Just use the first part of the message
      return content.length > 40 ? content.substring(0, 40) + "..." : content
    }
  }
}

/**
 * Update a conversation title based on its first message
 */
export async function updateConversationTitleFromMessage(id: string): Promise<{ success: boolean, message?: string }> {
  try {
    const { userId } = await auth()

    if (!userId) {
      console.log("User not authenticated, skipping title update")
      return { success: false, message: "Not authenticated" }
    }

    const supabase = await createServerSupabaseClient()

    // Verify the conversation belongs to the user
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single()

    if (conversationError || !conversation) {
      return { success: false, message: "Conversation not found" }
    }

    // Get the first user message
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("content, role")
      .eq("conversation_id", id)
      .eq("role", "user")
      .order("created_at", { ascending: true })
      .limit(1)

    if (messagesError) {
      console.error("Error fetching messages:", messagesError)
      return { success: false, message: "Failed to fetch messages" }
    }

    if (messages.length === 0) {
      console.log("No user messages found for conversation")
      return { success: false, message: "No messages found" }
    }

    // Generate a better title from the first message
    const firstMessage = messages[0].content
    const newTitle = await generateTitleFromMessage(firstMessage)

    // Update the conversation title
    const { error } = await supabase
      .from("conversations")
      .update({ title: newTitle })
      .eq("id", id)

    if (error) {
      console.error("Error updating conversation title:", error)
      return { success: false, message: "Failed to update title" }
    }

    revalidatePath("/")
    return { success: true }
  } catch (err) {
    console.error("Error updating conversation title from message:", err)
    return { success: false, message: "An error occurred" }
  }
}

/**
 * Update a conversation title
 */
export async function updateConversationTitle(id: string, title: string): Promise<void> {
  const { userId } = await auth()

  if (!userId) {
    console.log("User not authenticated, skipping title update")
    return
  }

  try {
    const supabase = await createServerSupabaseClient()

    // Verify the conversation belongs to the user
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single()

    if (conversationError || !conversation) {
      throw new Error("Conversation not found")
    }

    const { error } = await supabase
      .from("conversations")
      .update({ title })
      .eq("id", id)

    if (error) {
      console.error("Error updating conversation title:", error)
      throw new Error("Failed to update conversation title")
    }

    revalidatePath("/")
  } catch (err) {
    console.error("Error with Supabase, using mock data:", err)
    // No need to do anything for mock data as the client will handle the UI update
  }
}

/**
 * Update all generic conversation titles for a user
 */
export async function updateAllGenericConversationTitles(): Promise<{ success: boolean, message: string }> {
  try {
    const { userId } = await auth()

    if (!userId) {
      console.log("User not authenticated, skipping title updates")
      return { success: false, message: "Not authenticated" }
    }

    const supabase = await createServerSupabaseClient()

    // Get all conversations with generic titles
    const { data: conversations, error: conversationsError } = await supabase
      .from("conversations")
      .select("id, title")
      .eq("user_id", userId)
      .or("title.eq.New Conversation,title.eq.Tell me about this topic")

    if (conversationsError) {
      console.error("Error fetching conversations:", conversationsError)
      return { success: false, message: "Failed to fetch conversations" }
    }

    if (!conversations || conversations.length === 0) {
      return { success: true, message: "No generic titles found" }
    }

    console.log(`Found ${conversations.length} conversations with generic titles`)

    // Update each conversation title (limit to 10 at a time to avoid timeouts)
    const batchSize = 10;
    const batches = Math.ceil(conversations.length / batchSize);

    for (let i = 0; i < batches; i++) {
      const batch = conversations.slice(i * batchSize, (i + 1) * batchSize);
      await Promise.all(batch.map(conversation =>
        updateConversationTitleFromMessage(conversation.id)
      ));
    }

    revalidatePath("/")
    return { success: true, message: `Updated ${conversations.length} conversation titles` }
  } catch (err) {
    console.error("Error updating all generic conversation titles:", err)
    return { success: false, message: "An error occurred" }
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(id: string): Promise<{ success: boolean, message?: string }> {
  try {
    const { userId } = await auth()

    if (!userId) {
      console.log("User not authenticated, skipping conversation deletion")
      return { success: false, message: "Not authenticated" }
    }

    const supabase = await createServerSupabaseClient()

    // Verify the conversation belongs to the user
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single()

    if (conversationError || !conversation) {
      return { success: false, message: "Conversation not found" }
    }

    // Delete the conversation (messages will be deleted via cascade)
    const { error } = await supabase.from("conversations").delete().eq("id", id)

    if (error) {
      console.error("Error deleting conversation:", error)
      return { success: false, message: "Failed to delete conversation" }
    }

    revalidatePath("/")
    return { success: true }
  } catch (err) {
    console.error("Error deleting conversation:", err)
    return { success: false, message: "An error occurred" }
  }
}

/**
 * Save messages to a conversation
 */
export async function saveMessages(conversationId: string, messages: Message[]): Promise<void> {
  const { userId } = await auth()

  if (!userId) {
    console.log("User not authenticated, skipping message save")
    return
  }

  try {
    const supabase = await createServerSupabaseClient()

    // Verify the conversation belongs to the user
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single()

    if (conversationError || !conversation) {
      throw new Error("Conversation not found")
    }

    // CRITICAL FIX: Only save messages that don't already exist in the database
    // This prevents duplicate messages and ensures all messages are saved
    console.log("Checking for existing messages in conversation:", conversationId)
    console.log("Messages to save:", messages.map(m => ({ id: m.id, role: m.role, content: m.content.substring(0, 30) })))

    // Format messages for insertion, filtering out any that might already have UUIDs
    // (which would indicate they're already in the database)
    const messagesToInsert = messages
      .filter(message => {
        // If the message has an ID that looks like a UUID, it might already be in the database
        // UUID format: 8-4-4-4-12 hexadecimal digits
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const hasUuidId = message.id && uuidPattern.test(message.id);

        // Log what we're doing with this message
        console.log(`Message ${message.id} (${message.role}): ${hasUuidId ? 'skipping (has UUID)' : 'will save'}`);

        // If it has a UUID, it might be from the database, so we'll skip it
        // Otherwise, we'll include it for insertion
        return !hasUuidId;
      })
      .map((message) => ({
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
      }));

    // Only proceed if there are messages to insert
    if (messagesToInsert.length === 0) {
      console.log("No new messages to save for conversation:", conversationId);
      return;
    }

    console.log("Saving", messagesToInsert.length, "new messages to conversation:", conversationId);
    console.log("Messages to insert:", messagesToInsert.map(m => ({ role: m.role, content: m.content.substring(0, 30) })));

    // Insert messages
    const { data: insertedMessages, error } = await supabase.from("messages").insert(messagesToInsert).select()

    if (error) {
      console.error("Error saving messages:", error)
      throw new Error("Failed to save messages")
    }

    console.log("Successfully saved messages:", insertedMessages?.length || 0);
    if (insertedMessages) {
      console.log("Inserted message IDs:", insertedMessages.map(m => m.id));
    }

    // Update the conversation's updated_at timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId)

    revalidatePath("/")
  } catch (err) {
    console.error("Error with Supabase, using mock data:", err)
    // No need to do anything for mock data as the client will handle the UI update
  }
}

/**
 * Create a new conversation and save messages to it
 */
export async function createConversationWithMessages(
  title: string,
  messages: Message[]
): Promise<Conversation> {
  // Generate a better title if the provided one is empty or generic
  if (!title || title === "New Conversation" || title === "Tell me about this topic") {
    // Try to extract a title from the first user message
    const userMessage = messages.find(m => m.role === "user")
    if (userMessage) {
      title = await generateTitleFromMessage(userMessage.content)
    }
  }
  console.log("createConversationWithMessages called with title:", title, "and messages:", messages.length)
  const { userId } = await auth()
  console.log("User ID from auth():", userId)

  if (!userId) {
    console.log("User not authenticated, cannot create conversation with messages")
    throw new Error("User not authenticated")
  }

  try {
    console.log("Creating conversation with messages for user:", userId)
    const supabase = await createServerSupabaseClient()

    // Create a new conversation
    console.log("Inserting new conversation into Supabase for user:", userId)
    console.log("Conversation data:", { title })

    // Log the SQL query that would be executed
    console.log("SQL query would be: INSERT INTO conversations (user_id, title) VALUES ('" + userId + "', '" + title + "')")

    // Try to insert with explicit casting
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .insert([
        {
          user_id: userId,
          title,
        },
      ])
      .select()

    console.log("Insert conversation response:", { data: conversation, error: conversationError })

    if (conversationError || !conversation) {
      console.error("Error creating conversation:", conversationError)
      throw new Error("Failed to create conversation")
    }

    console.log("Successfully created conversation:", conversation[0]?.id)

    // Format messages for insertion
    console.log("Formatting messages for insertion, conversation ID:", conversation[0].id)
    const messagesToInsert = messages.map((message) => ({
      conversation_id: conversation[0].id,
      role: message.role,
      content: message.content,
    }))
    console.log("Messages to insert:", messagesToInsert)

    // Insert messages
    console.log("Inserting messages into Supabase")
    const { data: insertedMessages, error: messagesError } = await supabase.from("messages").insert(messagesToInsert).select()
    console.log("Insert messages response:", { data: insertedMessages, error: messagesError })

    if (messagesError) {
      console.error("Error saving messages:", messagesError)
      // Delete the conversation if we couldn't save the messages
      await supabase.from("conversations").delete().eq("id", conversation[0].id)
      throw new Error("Failed to save messages")
    }

    revalidatePath("/")

    return conversation[0]
  } catch (err) {
    console.error("Error with Supabase:", err)

    // Log more details about the error
    if (err instanceof Error) {
      console.error("Error name:", err.name)
      console.error("Error message:", err.message)
      console.error("Error stack:", err.stack)
    } else {
      console.error("Unknown error type:", typeof err)
      console.error("Error stringified:", JSON.stringify(err))
    }

    throw new Error("Failed to create conversation with messages")
  }
}
