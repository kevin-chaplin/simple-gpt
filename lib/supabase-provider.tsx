'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useSession, useUser } from '@clerk/nextjs'
import { createContext, useContext, useEffect, useState, useRef } from 'react'

type SupabaseContext = {
  supabase: SupabaseClient | null
  isLoaded: boolean
}

const Context = createContext<SupabaseContext>({
  supabase: null,
  isLoaded: false
})

export function useSupabase() {
  return useContext(Context)
}

// Create a singleton Supabase client to avoid multiple instances
let supabaseClientSingleton: SupabaseClient | null = null;

function createSupabaseClient(token?: string) {
  const options = token ? {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  } : undefined;

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    options
  );
}

type Props = {
  children: React.ReactNode
}

export default function SupabaseProvider({ children }: Props) {
  const { session, isLoaded: isSessionLoaded } = useSession()
  const { isLoaded: isUserLoaded, isSignedIn } = useUser()
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadingError, setLoadingError] = useState<string | null>(null)
  const authInitializedRef = useRef(false)

  // Initialize with anonymous client immediately
  useEffect(() => {
    if (supabase) return; // Already initialized

    try {
      // Use the singleton or create a new one
      if (!supabaseClientSingleton) {
        console.log("Creating initial anonymous Supabase client")
        supabaseClientSingleton = createSupabaseClient();
      }

      setSupabase(supabaseClientSingleton);
      setIsLoaded(true);
    } catch (error) {
      console.error("Error creating initial Supabase client:", error);
      setLoadingError("Failed to initialize application");
    }

    // Force a refresh after 1 second if we're still on the loading screen
    // This helps with the initial load issue
    const forceRefreshTimeout = setTimeout(() => {
      if (document.body.textContent?.includes('Loading...')) {
        console.log('Still on loading screen after 1s, forcing refresh');
        window.location.reload();
      }
    }, 1000);

    return () => clearTimeout(forceRefreshTimeout);
  }, []);

  // Update client with authentication when Clerk loads
  useEffect(() => {
    // Only proceed if we have a client and Clerk has loaded
    if (!supabase || !isUserLoaded || !isSessionLoaded) {
      return;
    }

    // Skip if we've already initialized auth or don't have a session
    if (authInitializedRef.current || !isSignedIn || !session) {
      return;
    }

    const updateSupabaseAuth = async () => {
      try {
        console.log("User signed in, updating client with auth token");
        const token = await session.getToken({ template: "supabase" });

        if (!token) {
          console.warn("No token available from Clerk session");
          return;
        }

        // Update the singleton with auth
        supabaseClientSingleton = createSupabaseClient(token);
        setSupabase(supabaseClientSingleton);
        authInitializedRef.current = true;
        console.log("Supabase client updated with auth token");
      } catch (error) {
        console.error("Error updating Supabase client with auth:", error);
      }
    };

    updateSupabaseAuth();
  }, [session, isSessionLoaded, isUserLoaded, isSignedIn, supabase]);

  return (
    <Context.Provider value={{ supabase, isLoaded }}>
      {loadingError ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-md max-w-md text-center">
            <p className="font-medium">Error loading application</p>
            <p className="text-sm mt-1">{loadingError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      ) : (
        children
      )}
    </Context.Provider>
  )
}

// Removing duplicate export
