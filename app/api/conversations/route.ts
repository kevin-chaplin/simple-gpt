import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { logDebug, logError } from "@/lib/debug"

export async function GET(req: Request) {
  try {
    // Check if the user is authenticated
    const session = await auth()

    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // Get all conversations for the user, ordered by most recently updated
    const { data, error } = await supabase
      .from("conversations")
      .select(`
        id,
        user_id,
        title,
        created_at,
        updated_at
      `)
      .eq("user_id", session.userId)
      .order("updated_at", { ascending: false })

    if (error) {
      logError("API", `Error fetching conversations: ${error.message}`)
      return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 })
    }

    // For each conversation, get the last message
    const conversationsWithLastMessage = await Promise.all(
      data.map(async (conversation) => {
        const { data: messages, error: messagesError } = await supabase
          .from("messages")
          .select("content, role")
          .eq("conversation_id", conversation.id)
          .eq("role", "user") // Only get user messages for the preview
          .order("created_at", { ascending: false })
          .limit(1)

        if (messagesError) {
          logError("API", `Error fetching last message: ${messagesError.message}`)
          return conversation
        }

        return {
          ...conversation,
          last_message: messages.length > 0 ? messages[0].content : "",
        }
      })
    )

    return NextResponse.json(conversationsWithLastMessage)
  } catch (error) {
    logError("API", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // Check if the user is authenticated
    const session = await auth()

    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { title, messages } = body

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Create a new conversation
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .insert([
        {
          user_id: session.userId,
          title,
        },
      ])
      .select()

    if (conversationError) {
      logError("API", `Error creating conversation: ${conversationError.message}`)
      return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 })
    }

    // Format messages for insertion
    const messagesToInsert = messages.map((message: any) => ({
      conversation_id: conversation[0].id,
      role: message.role,
      content: message.content,
    }))

    // Insert messages
    const { error: messagesError } = await supabase.from("messages").insert(messagesToInsert)

    if (messagesError) {
      logError("API", `Error saving messages: ${messagesError.message}`)
      // Delete the conversation if we couldn't save the messages
      await supabase.from("conversations").delete().eq("id", conversation[0].id)
      return NextResponse.json({ error: "Failed to save messages" }, { status: 500 })
    }

    return NextResponse.json(conversation[0])
  } catch (error) {
    logError("API", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
