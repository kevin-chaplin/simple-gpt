import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
  getUserSubscription,
  getUserDailyUsage,
  getTimeUntilReset
} from "@/lib/usage-limits"
import { formatTimeUntilReset, PLAN_LIMITS } from "@/lib/usage-utils"
import { logDebug, logError } from "@/lib/debug"

export async function GET() {
  try {
    // Check if the user is authenticated
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the user's subscription
    const subscription = await getUserSubscription()

    if (!subscription) {
      return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 })
    }

    // Get the user's usage for today
    const usage = await getUserDailyUsage()

    if (!usage) {
      return NextResponse.json({ error: "Failed to fetch usage" }, { status: 500 })
    }

    // Calculate time until reset
    const timeUntilResetMs = await getTimeUntilReset()
    const timeUntilReset = formatTimeUntilReset(timeUntilResetMs)

    // Check if the user has reached their limit
    const messageLimit = subscription.daily_message_limit < 0 ? Infinity : subscription.daily_message_limit
    const hasReachedLimit = usage.message_count >= messageLimit

    return NextResponse.json({
      messageCount: usage.message_count,
      messageLimit: messageLimit === Infinity ? -1 : messageLimit,
      hasReachedLimit,
      timeUntilReset,
      plan: subscription.plan,
      historyDays: subscription.history_days < 0 ? Infinity : subscription.history_days
    })
  } catch (error) {
    logError("API", `Error in usage API: ${error}`)
    return NextResponse.json(
      { error: "Failed to fetch usage" },
      { status: 500 }
    )
  }
}
