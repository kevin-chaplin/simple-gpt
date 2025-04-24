import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10', // Use the latest API version
  typescript: true,
});

export const getStripeCustomerId = async (userId: string) => {
  // This function would typically check if a user already has a Stripe customer ID
  // If not, it would create one and store it in your database
  
  // For now, we'll implement a simple version that creates a new customer each time
  // In a real app, you'd want to store and retrieve this from your database
  const customer = await stripe.customers.create({
    metadata: {
      userId,
    },
  });
  
  return customer.id;
};
