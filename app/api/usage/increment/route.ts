import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
  getUserSubscription,
  incrementUserMessageCount,
  getTimeUntilReset
} from "@/lib/usage-limits"
import { formatTimeUntilReset } from "@/lib/usage-utils"
import { logDebug, logError } from "@/lib/debug"

export async function POST() {
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

    // Increment the user's message count
    const newCount = await incrementUserMessageCount()

    // Calculate time until reset
    const timeUntilResetMs = await getTimeUntilReset()
    const timeUntilReset = formatTimeUntilReset(timeUntilResetMs)

    // Check if the user has reached their limit
    const messageLimit = subscription.daily_message_limit < 0 ? Infinity : subscription.daily_message_limit
    const hasReachedLimit = newCount >= messageLimit

    return NextResponse.json({
      messageCount: newCount,
      messageLimit: messageLimit === Infinity ? -1 : messageLimit,
      hasReachedLimit,
      timeUntilReset
    })
  } catch (error) {
    logError("API", `Error in usage increment API: ${error}`)
    return NextResponse.json(
      { error: "Failed to increment usage" },
      { status: 500 }
    )
  }
}
