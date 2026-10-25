import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { StoreError } from "@/lib/errors";
import { normalizePhone } from "@/lib/phone";

/**
 * Supabase Auth, used only to prove someone owns a phone number or a Google account.
 * Supabase sends and checks SMS codes (through the provider set in the dashboard) and runs the
 * Google sign-in; the app's own token in lib/auth.ts stays the session.
 */
let client: SupabaseClient | null = null;

function auth() {
  // Prefer the same public URL the browser uses for Google OAuth so access tokens validate.
  // A mismatched SUPABASE_URL (different project) makes exchange succeed client-side then fail here.
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)?.trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();
  if (!url || !key) throw new StoreError(503, "Sign-in isn't set up yet");
  client ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client.auth;
}

/** Text a 6-digit code to the number. */
export async function sendPhoneCode(phone: string): Promise<void> {
  const { error } = await auth().signInWithOtp({ phone });
  if (!error) return;
  console.error("Supabase signInWithOtp failed:", error.status, error.message);
  if (error.status === 429) {
    throw new StoreError(429, "Too many codes sent. Wait a minute and try again.");
  }
  throw new StoreError(502, "Couldn't send a code. Check the number and try again.");
}

/**
 * Check the code. Returns a proof of ownership (Supabase's access token for that number,
 * valid about an hour) or null if the code is wrong or expired.
 */
export async function checkPhoneCode(phone: string, code: string): Promise<string | null> {
  if (!/^\d{6}$/.test(code)) return null;
  const { data, error } = await auth().verifyOtp({ phone, token: code, type: "sms" });
  if (error || !data.session) return null;
  return data.session.access_token;
}

/** The verified number a proof belongs to, or null if the proof is invalid or expired. */
export async function phoneFromProof(proof: string): Promise<string | null> {
  if (!proof) return null;
  const { data, error } = await auth().getUser(proof);
  if (error || !data.user?.phone) return null;
  // Supabase stores numbers without the leading "+"
  return normalizePhone(`+${data.user.phone.replace(/^\+/, "")}`);
}

export type GoogleIdentity = {
  authUserId: string;
  email: string | null;
  name: string | null;
  /** Google profile picture, or null if the account has none. */
  avatarUrl: string | null;
};

function isGoogleUser(user: {
  identities?: { provider?: string }[] | null;
  app_metadata?: Record<string, unknown> | null;
}): boolean {
  if ((user.identities ?? []).some((identity) => identity.provider === "google")) return true;
  const meta = user.app_metadata ?? {};
  if (meta.provider === "google") return true;
  const providers = meta.providers;
  return Array.isArray(providers) && providers.includes("google");
}

/**
 * The Google account a proof belongs to (the Supabase access token from the browser's
 * Google sign-in), or null if the proof is invalid, expired, or not from Google.
 */
export async function googleFromProof(proof: string): Promise<GoogleIdentity | null> {
  if (!proof) return null;
  const { data, error } = await auth().getUser(proof);
  const user = data?.user;
  if (error || !user) {
    if (error) console.error("googleFromProof getUser failed:", error.message);
    return null;
  }
  if (!isGoogleUser(user)) {
    console.error("googleFromProof: user is not a Google identity", user.id);
    return null;
  }
  const meta = user.user_metadata ?? {};
  const name = typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : null;
  const picture = typeof meta.avatar_url === "string" ? meta.avatar_url : typeof meta.picture === "string" ? meta.picture : null;
  return { authUserId: user.id, email: user.email ?? null, name, avatarUrl: picture ? largerGooglePicture(picture) : null };
}

/** Google sends a 96px picture ("...=s96-c"); ask for 256px so it stays sharp on profile screens. */
function largerGooglePicture(url: string): string {
  return url.replace(/=s\d+-c$/, "=s256-c");
}
