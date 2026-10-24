import { errorResponse, readJson, StoreError } from "@/lib/errors";
import { checkPhoneCode } from "@/lib/phone-auth";
import { normalizePhone } from "@/lib/phone";
import { loginByPhone } from "@/lib/store";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Checks the SMS code with Supabase.
 * Known number: logs that profile in on this device (returns its token).
 * New number: returns a phone proof that signup must send back.
 */
export async function POST(request: Request) {
  try {
    const json = await readJson(request);
    if (!isRecord(json)) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }

    const phone = normalizePhone(typeof json.phone === "string" ? json.phone : "");
    if (!phone) throw new StoreError(400, "Enter a valid phone number");

    const code = typeof json.code === "string" ? json.code.trim() : "";
    const proof = await checkPhoneCode(phone, code);
    // 400, not 401: the client treats 401 as "this device's profile is gone" and restarts onboarding
    if (!proof) throw new StoreError(400, "That code didn’t work. Try again.");

    const existing = await loginByPhone(phone);
    if (existing) {
      return Response.json({ ok: true, phone, isNew: false, user: existing.profile, token: existing.token });
    }
    return Response.json({ ok: true, phone, isNew: true, user: null, phoneProof: proof });
  } catch (error) {
    return errorResponse(error);
  }
}
