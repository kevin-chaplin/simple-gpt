import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { logDebug, logError } from "@/lib/debug"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id

    // Check if the user is authenticated
    const session = await auth()

    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // Get the conversation
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.userId)
      .single()

    if (conversationError) {
      if (conversationError.code === "PGRST116") {
        // Record not found
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
      }
      logError("API", `Error fetching conversation: ${conversationError.message}`)
      return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 })
    }

    // Get all messages for the conversation
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })

    if (messagesError) {
      logError("API", `Error fetching messages: ${messagesError.message}`)
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
    }

    // Format messages to match the AI SDK Message type
    const formattedMessages = messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
    }))

    return NextResponse.json({
      ...conversation,
      messages: formattedMessages,
    })
  } catch (error) {
    logError("API", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id

    // Check if the user is authenticated
    const session = await auth()

    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { title, messages } = body

    const supabase = await createServerSupabaseClient()

    // Verify the conversation belongs to the user
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.userId)
      .single()

    if (conversationError) {
      if (conversationError.code === "PGRST116") {
        // Record not found
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
      }
      logError("API", `Error fetching conversation: ${conversationError.message}`)
      return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 })
    }

    // Update the conversation title if provided
    if (title) {
      const { error: updateError } = await supabase
        .from("conversations")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", id)

      if (updateError) {
        logError("API", `Error updating conversation title: ${updateError.message}`)
        return NextResponse.json({ error: "Failed to update conversation title" }, { status: 500 })
      }
    }

    // Add new messages if provided
    if (messages && Array.isArray(messages) && messages.length > 0) {
      // Format messages for insertion
      const messagesToInsert = messages.map((message: any) => ({
        conversation_id: id,
        role: message.role,
        content: message.content,
      }))

      // Insert messages
      const { error: messagesError } = await supabase.from("messages").insert(messagesToInsert)

      if (messagesError) {
        logError("API", `Error saving messages: ${messagesError.message}`)
        return NextResponse.json({ error: "Failed to save messages" }, { status: 500 })
      }

      // Update the conversation's updated_at timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logError("API", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id

    // Check if the user is authenticated
    const session = await auth()

    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // Verify the conversation belongs to the user
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.userId)
      .single()

    if (conversationError) {
      if (conversationError.code === "PGRST116") {
        // Record not found
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
      }
      logError("API", `Error fetching conversation: ${conversationError.message}`)
      return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 })
    }

    // Delete the conversation (messages will be deleted via cascade)
    const { error } = await supabase.from("conversations").delete().eq("id", id)

    if (error) {
      logError("API", `Error deleting conversation: ${error.message}`)
      return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logError("API", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
