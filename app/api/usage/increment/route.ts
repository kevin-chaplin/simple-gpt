import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { PLAN_LIMITS } from "@/lib/usage-utils"
import { logDebug, logError } from "@/lib/debug"

// Function to get a user's subscription
async function getUserSubscription(userId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
      
    if (error) {
      throw error;
    }
    
    return data || { plan: "free", status: "active" };
  } catch (error) {
    logError("Usage", `Error in getUserSubscription: ${error}`);
    // Return a default subscription if there's an error
    return { plan: "free", status: "active" };
  }
}

// Function to increment a user's daily usage
async function incrementUserDailyUsage(userId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // First check if there's already a record for today
    const { data: existingRecord, error: fetchError } = await supabase
      .from("user_usage")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();
      
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows found"
      throw fetchError;
    }
    
    if (existingRecord) {
      // Update existing record
      const { data, error } = await supabase
        .from("user_usage")
        .update({ message_count: existingRecord.message_count + 1 })
        .eq("id", existingRecord.id)
        .select()
        .single();
        
      if (error) throw error;
      return data.message_count;
    } else {
      // Create new record
      const { data, error } = await supabase
        .from("user_usage")
        .insert([
          { user_id: userId, date: today, message_count: 1 }
        ])
        .select()
        .single();
        
      if (error) throw error;
      return data.message_count;
    }
  } catch (error) {
    logError("Usage", `Error incrementing usage: ${error}`);
    throw error;
  }
}

export async function POST() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get user's subscription to determine limit
    const subscription = await getUserSubscription(userId);
    const plan = subscription?.plan || "free";
    const messageLimit = PLAN_LIMITS[plan]?.dailyMessageLimit || PLAN_LIMITS.free.dailyMessageLimit;
    
    // Increment usage
    const messageCount = await incrementUserDailyUsage(userId);
    
    // Check if they've reached their limit
    const hasReachedLimit = messageCount >= messageLimit;
    
    return NextResponse.json({
      messageCount,
      messageLimit,
      hasReachedLimit,
      plan
    });
  } catch (error) {
    logError("API", `Error incrementing usage: ${error.message}`);
    return NextResponse.json(
      { error: "Failed to increment usage" },
      { status: 500 }
    );
  }
}
