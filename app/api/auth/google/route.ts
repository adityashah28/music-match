import { errorResponse, readJson, StoreError } from "@/lib/errors";
import { loginByAuthUser } from "@/lib/store";
import { googleFromProof } from "@/lib/supabase-auth";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Finishes Google sign-in. Body: { accessToken } from the browser's Supabase session
 * (see completeGoogleSignIn in lib/client.ts).
 * Known Google account: logs that profile in on this device (returns its token).
 * New Google account: returns the proof that signup must send back, plus name/email to prefill.
 */
export async function POST(request: Request) {
  try {
    const json = await readJson(request);
    const accessToken = isRecord(json) && typeof json.accessToken === "string" ? json.accessToken : "";
    const google = await googleFromProof(accessToken);
    // 400, not 401: the client treats 401 as "this device's profile is gone" and restarts onboarding
    if (!google) throw new StoreError(400, "Google sign-in didn’t work. Try again.");

    const existing = await loginByAuthUser(google.authUserId);
    if (existing) {
      return Response.json({ ok: true, isNew: false, user: existing.profile, token: existing.token });
    }
    return Response.json({
      ok: true,
      isNew: true,
      user: null,
      authProof: accessToken,
      name: google.name,
      email: google.email,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
