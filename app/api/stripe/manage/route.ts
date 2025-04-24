import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase";
import { logDebug, logError } from "@/lib/debug";

export async function POST(req: Request) {
  try {
    // Check if the user is authenticated
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Get the user's subscription
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      logError("API", `Error fetching subscription: ${error.message}`);
      return NextResponse.json(
        { error: "Failed to fetch subscription" },
        { status: 500 }
      );
    }

    if (!subscription || !subscription.stripe_customer_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    // Create a Stripe billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logError("API", `Error creating billing portal session: ${error}`);
    return NextResponse.json(
      { error: "Failed to create billing portal session" },
      { status: 500 }
    );
  }
}
