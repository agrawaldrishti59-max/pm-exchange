import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Use a singleton to preserve PKCE verifier across redirects
const createSupabaseClient = () => createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: "pm-exchange-auth",
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Singleton instance
let instance: ReturnType<typeof createSupabaseClient> | null = null;

export const supabase = (() => {
  if (typeof window === "undefined") return createSupabaseClient();
  if (!instance) instance = createSupabaseClient();
  return instance;
})();