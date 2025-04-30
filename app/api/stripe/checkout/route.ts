import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe, getStripeCustomerId } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase";
import { logDebug, logError } from "@/lib/debug";

// Define the pricing plans
const PLANS = {
  free: {
    name: "Free",
    price: 0,
    features: ["5 AI conversations per day", "7 day conversation history"],
    stripePriceId: "", // Free plan doesn't need a price ID
  },
  pro: {
    name: "Pro",
    price: 9.99,
    features: ["Unlimited AI Conversations", "Basic support", "30 day conversation history"],
    stripePriceId: "price_1RJU4CA2QuISYnSWiFH9701t", // You'll need to replace this with your actual Stripe price ID
  },
  premium: {
    name: "Premium",
    price: 19.99,
    features: ["Everything in Pro", "Unlimited conversation history", "Premium support"],
    stripePriceId: "price_1RJU4IA2QuISYnSWUKCANAhC", // You'll need to replace this with your actual Stripe price ID
  },
};

export async function POST(req: Request) {
  try {
    // Get the plan from the request body
    const { plan } = await req.json();

    // Check if the plan is valid
    if (!plan || !PLANS[plan as keyof typeof PLANS]) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    // Get the selected plan
    const selectedPlan = PLANS[plan as keyof typeof PLANS];

    // Check if the plan is free
    if (plan === "free") {
      return NextResponse.json(
        { error: "Cannot checkout with a free plan" },
        { status: 400 }
      );
    }

    // Check if the user is authenticated
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get or create a Stripe customer ID for the user
    const customerId = await getStripeCustomerId(userId);

    // Log the customer ID and plan
    logDebug("API", `Creating checkout session for user ${userId}, plan ${plan}, customer ${customerId}`);

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: selectedPlan.stripePriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/pricing?canceled=true`,
      metadata: {
        userId,
        plan,
      },
      subscription_data: {
        metadata: {
          userId,
          plan,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logError("API", `Error creating checkout session: ${error}`);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
