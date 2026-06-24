import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? "Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local."
    : null;

if (import.meta.env.DEV && supabaseConfigError) {
  console.warn(
    "Supabase client is missing Vite environment variables. URL present:",
    Boolean(supabaseUrl),
    "anon key present:",
    Boolean(supabaseAnonKey)
  );
}

export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabaseAnonKey);

export function requireSupabaseClient() {
  if (!supabase) {
    throw new Error(supabaseConfigError);
  }

  return supabase;
}
