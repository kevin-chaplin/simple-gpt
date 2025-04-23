import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { auth } from "@clerk/nextjs/server"

export async function GET() {
  try {
    console.log("Testing JWT-based RLS policies...")
    
    // Get the authenticated user
    const { userId } = await auth()
    console.log("User ID:", userId || "Not authenticated")
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: "Not authenticated",
        message: "User not authenticated" 
      }, { status: 401 })
    }
    
    // Create Supabase client
    const supabase = await createServerSupabaseClient()
    console.log("Supabase client created successfully")
    
    // Try to insert a test conversation
    console.log("Inserting test conversation...")
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .insert([
        {
          user_id: userId,
          title: "Test JWT RLS Conversation",
        },
      ])
      .select()
    
    if (conversationError) {
      console.error("Error creating test conversation:", conversationError)
      return NextResponse.json({ 
        success: false, 
        error: conversationError,
        message: "Failed to create test conversation" 
      }, { status: 500 })
    }
    
    console.log("Test conversation created:", conversation)
    
    // Try to insert a test message
    console.log("Inserting test message...")
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert([
        {
          conversation_id: conversation[0].id,
          role: "user",
          content: "Test JWT RLS message",
        },
      ])
      .select()
    
    if (messageError) {
      console.error("Error creating test message:", messageError)
      return NextResponse.json({ 
        success: false, 
        error: messageError,
        message: "Failed to create test message" 
      }, { status: 500 })
    }
    
    console.log("Test message created:", message)
    
    // Try to fetch conversations for the current user
    console.log("Fetching conversations...")
    const { data: conversations, error: conversationsError } = await supabase
      .from("conversations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)
    
    if (conversationsError) {
      console.error("Error fetching conversations:", conversationsError)
      return NextResponse.json({ 
        success: false, 
        error: conversationsError,
        message: "Failed to fetch conversations" 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      conversation,
      message,
      conversations,
      message: "JWT RLS test successful" 
    })
  } catch (error) {
    console.error("Error testing JWT RLS:", error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      message: "Failed to test JWT RLS" 
    }, { status: 500 })
  }
}
