import { errorResponse, readJson, StoreError } from "@/lib/errors";
import { generateOtpCode, saveOtp, sendSms, shouldExposeDevCode } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";

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
    if (!phone) {
      throw new StoreError(400, "Enter a valid phone number");
    }

    const code = generateOtpCode();
    await saveOtp(phone, code);

    let sent = false;
    try {
      sent = await sendSms(phone, code);
    } catch {
      if (!shouldExposeDevCode()) {
        throw new StoreError(502, "Could not send a text. Try again.");
      }
    }

    const body: { ok: true; phone: string; sent: boolean; devCode?: string } = {
      ok: true,
      phone,
      sent,
    };
    if (shouldExposeDevCode()) body.devCode = code;

    return Response.json(body);
  } catch (error) {
    return errorResponse(error);
  }
}
