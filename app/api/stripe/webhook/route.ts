import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { createServiceRoleSupabaseClient } from "@/lib/supabase";
import { logDebug, logError } from "@/lib/debug";
import { updateSubscriptionLimits } from "@/lib/usage-limits";
import { PLAN_LIMITS } from "@/lib/usage-utils";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature") as string;

    // Verify the webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (error: any) {
      logError("API", `Webhook signature verification failed: ${error.message}`);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    // Log the event for debugging
    logDebug("API", `Processing Stripe webhook event: ${event.type}`);
    logDebug("API", `Event data: ${JSON.stringify(event.data.object)}`);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;

        // Log the session details for debugging
        logDebug("API", `Checkout session completed: ${JSON.stringify(session)}`);

        // Extract metadata
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;

        // Validate required data
        if (!userId || !plan) {
          logError("API", `Missing metadata in checkout session: userId=${userId}, plan=${plan}`);
          return NextResponse.json(
            { error: "Missing metadata in checkout session" },
            { status: 400 }
          );
        }

        // Update the user's subscription in your database using service role
        // to bypass RLS policies
        const supabase = createServiceRoleSupabaseClient();

        // Log the Supabase connection
        logDebug("API", "Supabase client created for subscription update");

        try {
          // Check if a subscription record already exists
          const { data: existingSubscription, error: fetchError } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", userId)
            .single();

          if (fetchError && fetchError.code !== "PGRST116") {
            // PGRST116 is the error code for "no rows found"
            logError("API", `Error fetching subscription: ${fetchError.message}`);
            return NextResponse.json(
              { error: "Failed to fetch subscription" },
              { status: 500 }
            );
          }

          // Get customer and subscription IDs
          const customerId = session.customer;
          // The subscription ID might not be immediately available in the session
          // We'll use the customer ID as a fallback for now
          const subscriptionId = session.subscription || `pending_${customerId}`;

          // If a subscription exists, update it; otherwise, create a new one
          if (existingSubscription) {
            logDebug("API", `Updating existing subscription for user ${userId}`);

            const { error: updateError } = await supabase
              .from("subscriptions")
              .update({
                plan,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                status: "active",
                cancel_at_period_end: false,
                current_period_end: null, // Will be updated when we get the subscription details
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", userId);

            if (updateError) {
              logError("API", `Error updating subscription: ${updateError.message}`);
              return NextResponse.json(
                { error: "Failed to update subscription" },
                { status: 500 }
              );
            }

            logDebug("API", "Subscription updated successfully");

            // Update subscription limits based on the plan
            try {
              // Log the plan details for debugging
              logDebug("API", `Updating usage limits for user ${userId} from checkout completion`);
              logDebug("API", `Plan: ${plan}`);

              await updateSubscriptionLimits(userId, plan);

              // Verify the update was successful by checking the database
              const { data: updatedSubscription, error: verifyError } = await supabase
                .from("subscriptions")
                .select("plan, daily_message_limit, history_days")
                .eq("user_id", userId)
                .single();

              if (verifyError) {
                logError("API", `Error verifying subscription update: ${verifyError.message}`);
              } else {
                logDebug("API", `Verified subscription update: ${JSON.stringify(updatedSubscription)}`);
              }

              logDebug("API", `Successfully updated usage limits for user ${userId} to ${plan} plan`);
            } catch (error) {
              logError("API", `Error updating subscription limits: ${error}`);
            }
          } else {
            logDebug("API", `Creating new subscription for user ${userId}`);

            const { error: insertError } = await supabase
              .from("subscriptions")
              .insert([
                {
                  user_id: userId,
                  plan,
                  stripe_customer_id: customerId,
                  stripe_subscription_id: subscriptionId,
                  status: "active",
                  cancel_at_period_end: false,
                  current_period_end: null, // Will be updated when we get the subscription details
                  daily_message_limit: plan === 'premium' || plan === 'pro' ? -1 : PLAN_LIMITS.free.dailyMessageLimit,
                  history_days: plan === 'premium' ? -1 : (plan === 'pro' ? PLAN_LIMITS.pro.historyDays : PLAN_LIMITS.free.historyDays),
                },
              ]);

            if (insertError) {
              logError("API", `Error creating subscription: ${insertError.message}`);
              return NextResponse.json(
                { error: "Failed to create subscription" },
                { status: 500 }
              );
            }

            logDebug("API", "Subscription created successfully");

            // Update subscription limits based on the plan
            try {
              // Log the plan details for debugging
              logDebug("API", `Updating usage limits for user ${userId} from new subscription`);
              logDebug("API", `Plan: ${plan}`);

              await updateSubscriptionLimits(userId, plan);

              // Verify the update was successful by checking the database
              const { data: updatedSubscription, error: verifyError } = await supabase
                .from("subscriptions")
                .select("plan, daily_message_limit, history_days")
                .eq("user_id", userId)
                .single();

              if (verifyError) {
                logError("API", `Error verifying subscription update: ${verifyError.message}`);
              } else {
                logDebug("API", `Verified subscription update: ${JSON.stringify(updatedSubscription)}`);
              }

              logDebug("API", `Successfully set usage limits for user ${userId} to ${plan} plan`);
            } catch (error) {
              logError("API", `Error updating subscription limits: ${error}`);
            }
          }
        } catch (error) {
          logError("API", `Unexpected error in subscription processing: ${error}`);
          return NextResponse.json(
            { error: "Unexpected error in subscription processing" },
            { status: 500 }
          );
        }

        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as any;

        // Log the subscription details for debugging
        logDebug("API", `Subscription updated: ${JSON.stringify(subscription)}`);

        // The metadata might be on the subscription object or we might need to look it up
        // by customer ID in our database
        const subscriptionId = subscription.id;

        if (!subscriptionId) {
          logError("API", "Missing subscription ID in subscription update event");
          return NextResponse.json(
            { error: "Missing subscription ID" },
            { status: 400 }
          );
        }

        // Update the subscription status in your database using service role
        const supabase = createServiceRoleSupabaseClient();

        try {
          // First, check if we have this subscription in our database
          const { data: existingSubscription, error: fetchError } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("stripe_subscription_id", subscriptionId)
            .single();

          if (fetchError && fetchError.code !== "PGRST116") {
            logError("API", `Error fetching subscription: ${fetchError.message}`);
            return NextResponse.json(
              { error: "Failed to fetch subscription" },
              { status: 500 }
            );
          }

          // If we don't have this subscription yet, we might need to look it up by customer ID
          if (!existingSubscription) {
            logDebug("API", `Subscription ${subscriptionId} not found, looking up by customer ID`);

            // Try to find by customer ID as a fallback
            const { data: customerSubscriptions, error: customerFetchError } = await supabase
              .from("subscriptions")
              .select("*")
              .eq("stripe_customer_id", subscription.customer)
              .limit(1);

            if (customerFetchError) {
              logError("API", `Error fetching subscription by customer: ${customerFetchError.message}`);
              return NextResponse.json(
                { error: "Failed to fetch subscription by customer" },
                { status: 500 }
              );
            }

            if (customerSubscriptions && customerSubscriptions.length > 0) {
              // Update the subscription ID for this customer's subscription
              const { error: updateError } = await supabase
                .from("subscriptions")
                .update({
                  stripe_subscription_id: subscriptionId,
                  status: subscription.status,
                  cancel_at_period_end: subscription.cancel_at_period_end || false,
                  current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", customerSubscriptions[0].id);

              if (updateError) {
                logError("API", `Error updating subscription: ${updateError.message}`);
                return NextResponse.json(
                  { error: "Failed to update subscription" },
                  { status: 500 }
                );
              }

              // Get the plan from the subscription
              const plan = customerSubscriptions[0].plan;

              // Update subscription limits based on the plan
              if (plan && subscription.status === 'active') {
                try {
                  // Log the plan details for debugging
                  logDebug("API", `Updating usage limits for user ${customerSubscriptions[0].user_id} from webhook`);
                  logDebug("API", `Plan: ${plan}, Status: ${subscription.status}`);

                  await updateSubscriptionLimits(customerSubscriptions[0].user_id, plan);

                  // Verify the update was successful by checking the database
                  const { data: updatedSubscription, error: verifyError } = await supabase
                    .from("subscriptions")
                    .select("plan, daily_message_limit, history_days")
                    .eq("user_id", customerSubscriptions[0].user_id)
                    .single();

                  if (verifyError) {
                    logError("API", `Error verifying subscription update: ${verifyError.message}`);
                  } else {
                    logDebug("API", `Verified subscription update: ${JSON.stringify(updatedSubscription)}`);
                  }

                  logDebug("API", `Successfully updated usage limits for user ${customerSubscriptions[0].user_id} to ${plan} plan`);
                } catch (error) {
                  logError("API", `Error updating subscription limits: ${error}`);
                }
              }

              logDebug("API", `Updated subscription for customer ${subscription.customer}`);
            } else {
              logDebug("API", `No subscription found for customer ${subscription.customer}`);
              // This might be a subscription created outside our system
              // We could create a new record here if needed
            }
          } else {
            // Normal update for existing subscription
            const { error } = await supabase
              .from("subscriptions")
              .update({
                status: subscription.status,
                cancel_at_period_end: subscription.cancel_at_period_end || false,
                current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
                updated_at: new Date().toISOString(),
              })
              .eq("stripe_subscription_id", subscriptionId);

            if (error) {
              logError("API", `Error updating subscription status: ${error.message}`);
              return NextResponse.json(
                { error: "Failed to update subscription status" },
                { status: 500 }
              );
            }

            // Get the plan from the existing subscription
            const plan = existingSubscription.plan;

            // Update subscription limits based on the plan
            if (plan && subscription.status === 'active') {
              try {
                // Log the plan details for debugging
                logDebug("API", `Updating usage limits for user ${existingSubscription.user_id} from webhook`);
                logDebug("API", `Plan: ${plan}, Status: ${subscription.status}`);

                await updateSubscriptionLimits(existingSubscription.user_id, plan);

                // Verify the update was successful by checking the database
                const { data: updatedSubscription, error: verifyError } = await supabase
                  .from("subscriptions")
                  .select("plan, daily_message_limit, history_days")
                  .eq("user_id", existingSubscription.user_id)
                  .single();

                if (verifyError) {
                  logError("API", `Error verifying subscription update: ${verifyError.message}`);
                } else {
                  logDebug("API", `Verified subscription update: ${JSON.stringify(updatedSubscription)}`);
                }

                logDebug("API", `Successfully updated usage limits for user ${existingSubscription.user_id} to ${plan} plan`);
              } catch (error) {
                logError("API", `Error updating subscription limits: ${error}`);
              }
            }

            logDebug("API", `Updated status for subscription ${subscriptionId} to ${subscription.status}`);
          }
        } catch (error) {
          logError("API", `Unexpected error in subscription update: ${error}`);
          return NextResponse.json(
            { error: "Unexpected error in subscription update" },
            { status: 500 }
          );
        }

        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;

        // Log the subscription details for debugging
        logDebug("API", `Subscription deleted: ${JSON.stringify(subscription)}`);

        const subscriptionId = subscription.id;

        if (!subscriptionId) {
          logError("API", "Missing subscription ID in subscription delete event");
          return NextResponse.json(
            { error: "Missing subscription ID" },
            { status: 400 }
          );
        }

        // Update the subscription status in your database using service role
        const supabase = createServiceRoleSupabaseClient();

        try {
          // First, get the subscription to find the user ID
          const { data: existingSubscription, error: fetchError } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("stripe_subscription_id", subscriptionId)
            .single();

          if (fetchError && fetchError.code !== "PGRST116") {
            logError("API", `Error fetching subscription: ${fetchError.message}`);
            return NextResponse.json(
              { error: "Failed to fetch subscription" },
              { status: 500 }
            );
          }

          // Update the subscription status
          const { error } = await supabase
            .from("subscriptions")
            .update({
              status: "canceled",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId);

          if (error) {
            logError("API", `Error canceling subscription: ${error.message}`);
            return NextResponse.json(
              { error: "Failed to cancel subscription" },
              { status: 500 }
            );
          }

          // If we found the subscription, update the user's limits to free plan
          if (existingSubscription) {
            await updateSubscriptionLimits(existingSubscription.user_id, "free");
            logDebug("API", `Reset usage limits for user ${existingSubscription.user_id} to free plan`);
          }

          logDebug("API", `Marked subscription ${subscriptionId} as canceled`);
        } catch (error) {
          logError("API", `Unexpected error in subscription cancellation: ${error}`);
          return NextResponse.json(
            { error: "Unexpected error in subscription cancellation" },
            { status: 500 }
          );
        }

        break;
      }
      default:
        logDebug("API", `Unhandled event type: ${event.type}`);
    }

    // Successfully processed the event
    logDebug("API", `Successfully processed webhook event: ${event.type}`);
    return NextResponse.json({ received: true });
  } catch (error) {
    logError("API", `Webhook error: ${error}`);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
