import { auth } from "@clerk/nextjs/server"
import { createClient } from "@supabase/supabase-js"

/**
 * Creates a Supabase client for server-side usage with Clerk authentication
 * Uses JWT token from Clerk to authenticate with Supabase
 */
export const createServerSupabaseClient = async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { getToken } = await auth();
  const token = await getToken({ template: "supabase" });

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  // If no token (user not authenticated), create a client with just the anon key
  if (!token) {
    return createClient(supabaseUrl, supabaseKey);
  }

  // Create client with JWT auth
  const client = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  return client;
};

// Create a singleton for server-side usage to avoid creating multiple clients
let serverSupabaseClient: ReturnType<typeof createClient> | null = null
let serverSupabaseToken: string | null = null

/**
 * Creates a cached Supabase client for server-side usage
 * Reuses the client if the token hasn't changed
 */
export const createCachedServerSupabaseClient = async () => {
  const { getToken } = await auth();
  const token = await getToken({ template: "supabase" });

  // If token changed or no client exists, create a new one
  if (token !== serverSupabaseToken || !serverSupabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    // If no token (user not authenticated), create a client with just the anon key
    if (!token) {
      serverSupabaseClient = createClient(supabaseUrl, supabaseKey);
    } else {
      // Create client with JWT auth
      serverSupabaseClient = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });
    }

    serverSupabaseToken = token;
  }

  return serverSupabaseClient;
}
