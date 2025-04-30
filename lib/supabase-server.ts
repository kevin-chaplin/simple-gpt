import 'server-only';
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { logDebug, logError } from "@/lib/debug";

/**
 * Creates a Supabase client for server-side usage with Clerk authentication
 * Uses JWT token from Clerk to authenticate with Supabase
 */
export const createServerSupabaseClient = async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }
  
  try {
    const { getToken } = await auth();
    const token = await getToken({ template: "supabase" });

    // If no token (user not authenticated), create a client with just the anon key
    if (!token) {
      return createClient(supabaseUrl, supabaseKey);
    }

    // Create client with JWT auth
    return createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  } catch (error) {
    logError("Supabase", `Error creating server Supabase client: ${error.message}`);
    // Fall back to anonymous client if auth fails
    return createClient(supabaseUrl, supabaseKey);
  }
};

/**
 * Creates a Supabase client with service role for admin operations
 * This should only be used in trusted server contexts like webhooks
 */
export const createServiceRoleSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    logError("Supabase", "Missing Supabase service role environment variables");
    throw new Error("Missing Supabase service role environment variables");
  }

  logDebug("Supabase", "Creating service role client");

  // Create client with service role key
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};
