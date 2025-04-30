import { createClient } from "@supabase/supabase-js"
import { logDebug, logError } from "@/lib/debug"

// Use a separate import for server-side auth, which won't be included in client bundles
let authImport: any = null;
if (typeof window === 'undefined') {
  // This import will only happen on the server
  import('@clerk/nextjs/server').then(({ auth }) => {
    authImport = { auth };
  });
}

/**
 * Creates a Supabase client for server-side usage with Clerk authentication
 * Uses JWT token from Clerk to authenticate with Supabase
 */
export const createServerSupabaseClient = async () => {
  // This function should only be called on the server
  if (typeof window !== 'undefined') {
    throw new Error("createServerSupabaseClient should only be called on the server");
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Get auth from server-side import
  if (!authImport) {
    // Wait for import to complete (should be quick as it's happening at module initialization)
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  const { getToken } = await authImport.auth();
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
  if (typeof window !== 'undefined') {
    throw new Error("createCachedServerSupabaseClient should only be called on the server");
  }
  
  if (!authImport) {
    // Wait for import to complete
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  const { getToken } = await authImport.auth();
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

/**
 * Creates a Supabase client with service role for admin operations
 * This should only be used in trusted server contexts like webhooks
 */
export const createServiceRoleSupabaseClient = () => {
  if (typeof window !== 'undefined') {
    throw new Error("createServiceRoleSupabaseClient should only be called on the server");
  }
  
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
}
