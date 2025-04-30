import { createClient } from "@supabase/supabase-js"
import { logDebug, logError } from "@/lib/debug"

// Only for client-side usage!
export const createClientSupabaseClient = (token?: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const options = token ? {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  } : undefined;

  return createClient(supabaseUrl, supabaseKey, options);
}

// Do NOT import or re-export anything from supabase-server.ts here!
