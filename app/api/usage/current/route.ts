import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServerSupabaseClient } from "@/lib/supabase-server" // Make sure this is correct
import { formatTimeUntilReset, PLAN_LIMITS } from "@/lib/usage-utils"
import { logDebug, logError } from "@/lib/debug"

// The function to get a user's subscription
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

// The function to get a user's daily usage
async function getUserDailyUsage(userId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const { data, error } = await supabase
      .from("user_usage")
      .select("message_count")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();
      
    if (error) {
      throw error;
    }
    
    return data?.message_count || 0;
  } catch (error) {
    logError("Usage", `Error in getUserDailyUsage: ${error}`);
    return 0; // Return 0 if there's an error
  }
}

// Function to calculate time until reset
async function getTimeUntilReset() {
  // Simple implementation - reset every day at midnight
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  return formatTimeUntilReset(tomorrow.getTime() - now.getTime());
}

export async function GET() {
  try {
    const { userId } = await auth();
    const isAuthenticated = !!userId;
    
    // Default values
    let messageLimit = 5; // Anonymous limit
    let messageCount = 0;
    let timeUntilReset = await getTimeUntilReset();
    let hasMessageLimit = true; // Default to true for anonymous users
    
    if (isAuthenticated && userId) {
      try {
        // Get user's subscription
        const subscription = await getUserSubscription(userId);
        const plan = subscription?.plan || "free";
        
        // Get message limit for the plan
        messageLimit = PLAN_LIMITS[plan]?.dailyMessageLimit;
        
        // Check if this plan has a message limit
        // A message limit exists if messageLimit is not null, not undefined, greater than 0, and not Infinity
        hasMessageLimit = messageLimit !== null && 
                          messageLimit !== undefined && 
                          messageLimit > 0 && 
                          messageLimit !== Infinity;
        
        // If no message limit is defined for this plan, explicitly set it to null
        if (!hasMessageLimit) {
          messageLimit = null;
        }
        
        // Get current usage
        messageCount = await getUserDailyUsage(userId);
      } catch (error) {
        logError("API", `Error getting subscription or usage: ${error.message}`);
        // Use default free plan limits
        messageLimit = PLAN_LIMITS.free.dailyMessageLimit;
        hasMessageLimit = messageLimit !== null && 
                         messageLimit !== undefined && 
                         messageLimit > 0 && 
                         messageLimit !== Infinity;
        
        // If no message limit, set to null for consistency
        if (!hasMessageLimit) {
          messageLimit = null;
        }
      }
    }
    
    // Only consider reached limit if there is a limit to reach
    const hasReachedLimit = hasMessageLimit && messageCount >= messageLimit;
    
    // Add debug logging
    logDebug("Usage", `User ${userId}: hasMessageLimit=${hasMessageLimit}, messageLimit=${messageLimit}, messageCount=${messageCount}`);
    
    return NextResponse.json({
      messageCount,
      messageLimit,
      hasReachedLimit,
      timeUntilReset,
      isAuthenticated,
      hasMessageLimit
    });
  } catch (error) {
    logError("API", `Error in GET /api/usage/current: ${error.message}`);
    
    // Return sensible defaults in case of error
    return NextResponse.json({
      messageCount: 0,
      messageLimit: 5,
      hasReachedLimit: false,
      timeUntilReset: "24 hours",
      isAuthenticated: false,
      hasMessageLimit: true,
      error: "Internal server error"
    }, { status: 200 }); // Return 200 instead of 500 to prevent client errors
  }
}
