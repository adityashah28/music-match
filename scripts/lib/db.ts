// Supabase client for seed scripts. Uses the secret key, which bypasses row-level security.
// The app itself talks to the database through lib/store.ts.
import { createClient } from "@supabase/supabase-js";

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

export const supabase = createClient(url, key, { auth: { persistSession: false } });
