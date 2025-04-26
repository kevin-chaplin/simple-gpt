import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe, getStripeCustomerId } from "@/lib/stripe";
import { createServiceRoleSupabaseClient } from "@/lib/supabase";
import { logDebug, logError } from "@/lib/debug";

export async function POST(req: Request) {
  try {
    // Check if the user is authenticated
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the Supabase client with service role to bypass RLS
    const supabase = createServiceRoleSupabaseClient();

    // Get the user's subscription from the database
    const { data: subscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id, plan, status")
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      logError("API", `Error fetching subscription: ${fetchError.message}`);
      return NextResponse.json(
        { error: "Failed to fetch subscription" },
        { status: 500 }
      );
    }

    // Check if the user has an active subscription
    if (!subscription || subscription.status !== "active") {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    // Check if the subscription is already set to cancel
    if (subscription.status === "canceled") {
      return NextResponse.json(
        { message: "Subscription is already canceled" },
        { status: 200 }
      );
    }

    // Get the Stripe subscription ID
    const stripeSubscriptionId = subscription.stripe_subscription_id;

    if (!stripeSubscriptionId) {
      logError("API", "Missing Stripe subscription ID");
      return NextResponse.json(
        { error: "Missing Stripe subscription ID" },
        { status: 400 }
      );
    }

    // Cancel the subscription at the end of the current period
    const canceledSubscription = await stripe.subscriptions.update(
      stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    // Log the cancellation for debugging
    logDebug("API", `Subscription ${stripeSubscriptionId} set to cancel at period end`);
    logDebug("API", `Cancellation details: ${JSON.stringify(canceledSubscription)}`);

    // Update the subscription status in the database
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      logError("API", `Error updating subscription status: ${updateError.message}`);
      return NextResponse.json(
        { error: "Failed to update subscription status" },
        { status: 500 }
      );
    }

    // Return success response with the cancellation details
    return NextResponse.json({
      message: "Subscription will be canceled at the end of the current billing period",
      current_period_end: new Date(canceledSubscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: canceledSubscription.cancel_at_period_end,
    });
  } catch (error: any) {
    logError("API", `Error canceling subscription: ${error.message}`);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
