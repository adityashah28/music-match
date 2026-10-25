import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isInAppBrowser } from "@/lib/inAppBrowser";

/** Kept for SMS-credit / internal testing — not linked from primary CTAs. */
export const PHONE_AUTH_PATH = "/phone";

const CALLBACK_PATH = "/auth/callback";

let browserClient: SupabaseClient | null | undefined;

/**
 * Browser Supabase client (anon key). Null when public env vars are missing.
 * Teammate owns Google provider + session → Resonate token linking.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (browserClient !== undefined) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    browserClient = null;
    return null;
  }

  browserClient = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return browserClient;
}

export function googleAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export function authCallbackUrl(): string {
  if (typeof window === "undefined") return CALLBACK_PATH;
  return `${window.location.origin}${CALLBACK_PATH}`;
}

/**
 * Starts Google OAuth via Supabase. Redirects away on success.
 * Throws with a user-facing message when blocked or misconfigured.
 *
 * TODO(backend): enable Google provider in Supabase + Google Cloud OAuth client;
 * `/auth/callback` should mint a Resonate Bearer token after the session lands.
 */
export async function startGoogleSignIn(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Google sign-in only works in the browser.");
  }

  if (isInAppBrowser()) {
    throw new Error("IN_APP_BROWSER");
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error(
      "Google sign-in isn’t set up yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: authCallbackUrl(),
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error) {
    throw new Error(error.message || "Couldn’t start Google sign-in.");
  }
}
