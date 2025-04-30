import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { auth } from "@clerk/nextjs/server"

export async function GET() {
  try {
    console.log("Testing Supabase connection...")
    
    // Get the authenticated user
    const { userId } = await auth()
    console.log("User ID:", userId || "Not authenticated")
    
    // Create Supabase client
    const supabase = await createServerSupabaseClient()
    console.log("Supabase client created successfully")
    
    // Check if tables exist by trying to query them
    console.log("Checking if tables exist...")
    const { data: conversationsCheck, error: conversationsError } = await supabase
      .from("conversations")
      .select("id")
      .limit(1)
    
    if (conversationsError) {
      console.error("Error checking conversations table:", conversationsError)
    } else {
      console.log("Conversations table exists")
    }
    
    const { data: messagesCheck, error: messagesError } = await supabase
      .from("messages")
      .select("id")
      .limit(1)
    
    if (messagesError) {
      console.error("Error checking messages table:", messagesError)
    } else {
      console.log("Messages table exists")
    }
    
    // Test inserting a test conversation if user is authenticated
    if (userId) {
      console.log("Testing conversation creation...")
      const { data: conversation, error: conversationError } = await supabase
        .from("conversations")
        .insert([
          {
            user_id: userId,
            title: "Test Conversation",
          },
        ])
        .select()
      
      if (conversationError) {
        console.error("Error creating test conversation:", conversationError)
      } else {
        console.log("Test conversation created:", conversation)
        
        // Test inserting a test message
        const { data: message, error: messageError } = await supabase
          .from("messages")
          .insert([
            {
              conversation_id: conversation[0].id,
              role: "user",
              content: "Test message",
            },
          ])
          .select()
        
        if (messageError) {
          console.error("Error creating test message:", messageError)
        } else {
          console.log("Test message created:", message)
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      tables: [
        { name: "conversations", exists: !conversationsError },
        { name: "messages", exists: !messagesError }
      ],
      message: "Supabase connection test completed" 
    })
  } catch (error) {
    console.error("Error testing Supabase connection:", error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      message: "Failed to test Supabase connection" 
    }, { status: 500 })
  }
}
