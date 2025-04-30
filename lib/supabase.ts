import { createClient } from "@supabase/supabase-js"
import { logDebug, logError } from "@/lib/debug"

/**
 * Creates a basic Supabase client for client-side usage
 */
export const createClientSupabaseClient = (token?: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  // Create client with optional JWT auth
  const options = token ? {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  } : undefined;

  return createClient(supabaseUrl, supabaseKey, options);
};

// For backward compatibility - this will be deprecated
// This ensures existing code doesn't break, but should only be used in client components
export const createServerSupabaseClient = async () => {
  if (typeof window === 'undefined') {
    logError("Supabase", "Using createServerSupabaseClient from client library - please update to import from supabase-server");
    // Dynamic import to avoid bundling server code with client
    const { createServerSupabaseClient: serverClient } = await import('./supabase-server');
    return serverClient();
  }
  
  // Return client-side version for client components
  return createClientSupabaseClient();
};
