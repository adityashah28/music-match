import { errorResponse, readJson, StoreError } from "@/lib/errors";
import { sendPhoneCode } from "@/lib/phone-auth";
import { normalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Supabase texts the code. For demos, add test numbers with fixed codes in the Supabase dashboard. */
export async function POST(request: Request) {
  try {
    const json = await readJson(request);
    if (!isRecord(json)) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }

    const phone = normalizePhone(typeof json.phone === "string" ? json.phone : "");
    if (!phone) {
      throw new StoreError(400, "Enter a valid phone number");
    }

    await sendPhoneCode(phone);
    return Response.json({ ok: true, phone, sent: true });
  } catch (error) {
    return errorResponse(error);
  }
}
