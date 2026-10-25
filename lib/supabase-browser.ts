import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase, used only for the Google sign-in redirect. It holds the public
 * (anon/publishable) key, which can't read any table: row-level security blocks it.
 * Loaded on demand from lib/client.ts so other pages don't ship it.
 */
let client: SupabaseClient | null = null;

function supabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error("Google sign-in needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  // PKCE: Google sends back a one-time code that only this browser can exchange
  client ??= createClient(url, key, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

/** Leaves the app for Google's sign-in page; Google sends the user back to /auth/callback. */
export async function startGoogle(): Promise<void> {
  const { error } = await supabase().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw error;
}

function stripAuthParamsFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("code") && !url.searchParams.has("error")) return;
  url.search = "";
  window.history.replaceState({}, "", url.pathname);
}

/** On /auth/callback: trades the code in the URL for Supabase's access token (the proof). */
export async function finishGoogle(): Promise<string> {
  const client = supabase();
  const params = new URLSearchParams(window.location.search);
  const failure = params.get("error_description") ?? params.get("error");
  if (failure) throw new Error(failure);

  const code = params.get("code");
  if (code) {
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error || !data.session) {
      throw new Error(error?.message || "Google sign-in didn't finish");
    }
    stripAuthParamsFromUrl();
    return data.session.access_token;
  }

  // Remount after we stripped ?code=: reuse the session from the exchange above.
  const existing = await client.auth.getSession();
  if (existing.data.session?.access_token) {
    return existing.data.session.access_token;
  }
  throw new Error("Google didn't send a sign-in code back");
}

/** Clears any Google/Supabase browser session (no-op when env isn’t configured). */
export async function signOutGoogle(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return;
  await supabase().auth.signOut();
}
