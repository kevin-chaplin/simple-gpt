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
  // Check if we're on server or client
  if (typeof window === 'undefined') {
    // Server-side - dynamically import server version to avoid bundling issues
    try {
      // Use dynamic import with .then to avoid bundling issues
      return import('./supabase-server').then(({ createServerSupabaseClient: serverClient }) => {
        return serverClient();
      });
    } catch (error) {
      logError("Supabase", `Error importing server client: ${error.message}`);
      // Fallback to regular client with no auth if server import fails
      return createClientSupabaseClient();
    }
  }
  
  // Client-side - return client-side version
  return createClientSupabaseClient();
};
