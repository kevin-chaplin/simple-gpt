"use server"

import { auth } from "@clerk/nextjs/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function createConversation() {
  const { userId } = auth()

  if (!userId) {
    throw new Error("Unauthorized")
  }

  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("conversations")
    .insert([
      {
        user_id: userId,
        title: "New Conversation",
      },
    ])
    .select()

  if (error) {
    throw new Error("Failed to create conversation")
  }

  revalidatePath("/dashboard")

  return data[0]
}

export async function updateConversationTitle(id: string, title: string) {
  const { userId } = auth()

  if (!userId) {
    throw new Error("Unauthorized")
  }

  const supabase = createServerSupabaseClient()

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
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    throw new Error("Failed to update conversation title")
  }

  revalidatePath("/dashboard")
}

export async function deleteConversation(id: string) {
  const { userId } = auth()

  if (!userId) {
    throw new Error("Unauthorized")
  }

  const supabase = createServerSupabaseClient()

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

  // Delete the conversation (messages will be deleted via cascade)
  const { error } = await supabase.from("conversations").delete().eq("id", id)

  if (error) {
    throw new Error("Failed to delete conversation")
  }

  revalidatePath("/dashboard")
}
