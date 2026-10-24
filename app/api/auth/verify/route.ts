import { errorResponse, readJson, StoreError } from "@/lib/errors";
import { verifyOtp } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";
import { findUserByPhone } from "@/lib/store";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const json = await readJson(request);
    if (!isRecord(json)) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }

    const phone = normalizePhone(typeof json.phone === "string" ? json.phone : "");
    if (!phone) throw new StoreError(400, "Enter a valid phone number");

    const code = typeof json.code === "string" ? json.code.trim() : "";
    const ok = await verifyOtp(phone, code);
    // 400 (not 401): fetchJson treats 401 as a dead session and redirects home.
    if (!ok) throw new StoreError(400, "That code didn’t work. Try again.");

    const existing = await findUserByPhone(phone);
    return Response.json({
      ok: true,
      phone,
      isNew: !existing,
      user: existing,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
