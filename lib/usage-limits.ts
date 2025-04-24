"use server"

import { auth } from "@clerk/nextjs/server"
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase"
import { logDebug, logError } from "@/lib/debug"
import { PLAN_LIMITS } from "@/lib/usage-utils"

// Interface for user usage
interface UserUsage {
  id: string
  user_id: string
  date: string
  message_count: number
  created_at: string
  updated_at: string
}

// Interface for user subscription
interface UserSubscription {
  id: string
  user_id: string
  plan: string
  status: string
  daily_message_limit: number
  history_days: number
  created_at: string
  updated_at: string
}

/**
 * Get the current user's subscription plan
 * @returns The user's subscription plan or 'free' if not found
 */
export async function getUserSubscription(): Promise<UserSubscription | null> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return null
    }

    const supabase = await createServerSupabaseClient()

    // Get the user's subscription
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .single()

    if (error) {
      // If no subscription found, return default free plan
      if (error.code === "PGRST116") {
        return {
          id: "",
          user_id: userId,
          plan: "free",
          status: "active",
          daily_message_limit: PLAN_LIMITS.free.dailyMessageLimit,
          history_days: PLAN_LIMITS.free.historyDays,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }

      logError("Usage", `Error fetching subscription: ${error.message}`)
      throw new Error("Failed to fetch subscription")
    }

    return data
  } catch (error) {
    logError("Usage", `Error in getUserSubscription: ${error}`)
    return null
  }
}

/**
 * Get the current user's usage for today
 * @returns The user's usage for today
 */
export async function getUserDailyUsage(): Promise<UserUsage | null> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return null
    }

    const supabase = await createServerSupabaseClient()
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    // Get the user's usage for today
    const { data, error } = await supabase
      .from("user_usage")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .single()

    if (error) {
      // If no usage found for today, create a new record
      if (error.code === "PGRST116") {
        const { data: newUsage, error: createError } = await supabase
          .from("user_usage")
          .insert([
            {
              user_id: userId,
              date: today,
              message_count: 0
            }
          ])
          .select()
          .single()

        if (createError) {
          logError("Usage", `Error creating usage record: ${createError.message}`)
          throw new Error("Failed to create usage record")
        }

        return newUsage
      }

      logError("Usage", `Error fetching usage: ${error.message}`)
      throw new Error("Failed to fetch usage")
    }

    return data
  } catch (error) {
    logError("Usage", `Error in getUserDailyUsage: ${error}`)
    return null
  }
}

/**
 * Check if the user has reached their daily message limit
 * @returns true if the user has reached their limit, false otherwise
 */
export async function hasReachedDailyLimit(): Promise<boolean> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return false // Anonymous users are handled separately
    }

    // Get the user's subscription
    const subscription = await getUserSubscription()

    if (!subscription) {
      return false // Error fetching subscription, allow the request
    }

    // If the user has an unlimited plan, they haven't reached their limit
    if (subscription.daily_message_limit === Infinity ||
        subscription.daily_message_limit < 0) {
      return false
    }

    // Get the user's usage for today
    const usage = await getUserDailyUsage()

    if (!usage) {
      return false // Error fetching usage, allow the request
    }

    // Check if the user has reached their limit
    return usage.message_count >= subscription.daily_message_limit
  } catch (error) {
    logError("Usage", `Error in hasReachedDailyLimit: ${error}`)
    return false // Error checking limit, allow the request
  }
}

/**
 * Increment the user's message count for today
 * @returns The updated message count
 */
export async function incrementUserMessageCount(): Promise<number> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return 0
    }

    const supabase = await createServerSupabaseClient()
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    // Get the user's usage for today
    const { data: usage, error: usageError } = await supabase
      .from("user_usage")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .single()

    if (usageError) {
      // If no usage found for today, create a new record
      if (usageError.code === "PGRST116") {
        const { data: newUsage, error: createError } = await supabase
          .from("user_usage")
          .insert([
            {
              user_id: userId,
              date: today,
              message_count: 1 // Start with 1
            }
          ])
          .select()
          .single()

        if (createError) {
          logError("Usage", `Error creating usage record: ${createError.message}`)
          throw new Error("Failed to create usage record")
        }

        return 1
      }

      logError("Usage", `Error fetching usage: ${usageError.message}`)
      throw new Error("Failed to fetch usage")
    }

    // Increment the message count
    const newCount = usage.message_count + 1
    const { error: updateError } = await supabase
      .from("user_usage")
      .update({ message_count: newCount })
      .eq("id", usage.id)

    if (updateError) {
      logError("Usage", `Error updating usage: ${updateError.message}`)
      throw new Error("Failed to update usage")
    }

    return newCount
  } catch (error) {
    logError("Usage", `Error in incrementUserMessageCount: ${error}`)
    return 0
  }
}

/**
 * Get the time until the user's daily limit resets
 * @returns The time until reset in milliseconds
 */
export async function getTimeUntilReset(): Promise<number> {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  return tomorrow.getTime() - now.getTime()
}

/**
 * Prune old conversations based on the user's subscription plan
 * This should be called periodically to clean up old conversations
 */
export async function pruneOldConversations(): Promise<void> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return
    }

    // Get the user's subscription
    const subscription = await getUserSubscription()

    if (!subscription) {
      return
    }

    // If the user has unlimited history, don't prune
    if (subscription.history_days === Infinity ||
        subscription.history_days < 0) {
      return
    }

    const supabase = await createServerSupabaseClient()

    // Calculate the cutoff date
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - subscription.history_days)
    const cutoffDateStr = cutoffDate.toISOString()

    // Find conversations older than the cutoff date
    const { data: oldConversations, error: findError } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", userId)
      .lt("updated_at", cutoffDateStr)

    if (findError) {
      logError("Usage", `Error finding old conversations: ${findError.message}`)
      return
    }

    if (!oldConversations || oldConversations.length === 0) {
      return // No old conversations to prune
    }

    // Delete old conversations
    const oldConversationIds = oldConversations.map(conv => conv.id)
    const { error: deleteError } = await supabase
      .from("conversations")
      .delete()
      .in("id", oldConversationIds)

    if (deleteError) {
      logError("Usage", `Error deleting old conversations: ${deleteError.message}`)
      return
    }

    logDebug("Usage", `Pruned ${oldConversationIds.length} old conversations`)
  } catch (error) {
    logError("Usage", `Error in pruneOldConversations: ${error}`)
  }
}

/**
 * Update subscription plan limits in the database
 * This should be called when a user subscribes to a new plan
 */
export async function updateSubscriptionLimits(userId: string, plan: string): Promise<void> {
  try {
    if (!userId || !plan) {
      return
    }

    // Get the plan limits
    const planLimits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free

    // Use service role client to bypass RLS
    const supabase = createServiceRoleSupabaseClient()

    // Update the subscription limits
    const { error } = await supabase
      .from("subscriptions")
      .update({
        daily_message_limit: planLimits.dailyMessageLimit === Infinity ? -1 : planLimits.dailyMessageLimit,
        history_days: planLimits.historyDays === Infinity ? -1 : planLimits.historyDays
      })
      .eq("user_id", userId)

    if (error) {
      logError("Usage", `Error updating subscription limits: ${error.message}`)
    }
  } catch (error) {
    logError("Usage", `Error in updateSubscriptionLimits: ${error}`)
  }
}
