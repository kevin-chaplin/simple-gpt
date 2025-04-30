import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { auth } from "@clerk/nextjs/server"

export async function GET() {
  try {
    console.log("Testing RLS policies...")
    
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
          title: "Test RLS Conversation",
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
          content: "Test RLS message",
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
    
    return NextResponse.json({ 
      success: true, 
      conversation,
      message: "RLS test successful" 
    })
  } catch (error) {
    console.error("Error testing RLS:", error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      message: "Failed to test RLS" 
    }, { status: 500 })
  }
}
