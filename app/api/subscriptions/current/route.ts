import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { logDebug, logError } from "@/lib/debug";

export async function GET() {
  try {
    // Check if the user is authenticated
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    try {
      // Get the user's subscription
      const { data: subscription, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        // Check if it's a "no rows found" error
        if (error.code === "PGRST116") {
          // Return default free plan if no subscription found
          return NextResponse.json({
            subscription: {
              plan: "free",
              status: "active",
            },
          });
        }

        // Check if it's a "relation does not exist" error
        if (error.message && error.message.includes("relation") && error.message.includes("does not exist")) {
          logDebug("API", "Subscriptions table does not exist yet, returning free plan");
          return NextResponse.json({
            subscription: {
              plan: "free",
              status: "active",
            },
          });
        }

        // Other errors
        logError("API", `Error fetching subscription: ${error.message}`);
        return NextResponse.json(
          { error: "Failed to fetch subscription" },
          { status: 500 }
        );
      }

      // If no subscription is found, return a default free plan
      if (!subscription) {
        return NextResponse.json({
          subscription: {
            plan: "free",
            status: "active",
          },
        });
      }

      return NextResponse.json({ subscription });
    } catch (dbError: any) {
      // Catch any database-related errors
      logError("API", `Database error in subscription API: ${dbError.message}`);

      // Return free plan as fallback
      return NextResponse.json({
        subscription: {
          plan: "free",
          status: "active",
        },
      });
    }
  } catch (error: any) {
    logError("API", `Error in subscription API: ${error.message}`);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
