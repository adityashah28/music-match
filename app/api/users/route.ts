import { errorResponse, readJson, StoreError } from "@/lib/errors";
import { googleFromProof, phoneFromProof, type GoogleIdentity } from "@/lib/supabase-auth";
import { normalizePhone } from "@/lib/phone";
import { createUser } from "@/lib/store";
import type { ArtistInput, CreateUserBody } from "@/lib/types";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function optionalText(value: unknown): string | null | undefined {
  if (typeof value === "string") return value;
  if (value === null) return null;
  return undefined;
}

function optionalNumber(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new StoreError(400, `${label} is required`);
  }
  return value;
}

export async function POST(request: Request) {
  try {
    const json = await readJson(request);
    if (!isRecord(json)) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }

    // Identity must be proven, not just typed in: a Google sign-in (/api/auth/google)
    // or an SMS code for the number (/api/auth/verify)
    let phone: string | null = null;
    let google: GoogleIdentity | null = null;
    if (typeof json.authProof === "string" && json.authProof) {
      google = await googleFromProof(json.authProof);
      if (!google) {
        throw new StoreError(400, "Your Google sign-in expired. Go back and sign in with Google again.");
      }
    } else {
      phone = await phoneFromProof(typeof json.phoneProof === "string" ? json.phoneProof : "");
      const claimed = normalizePhone(typeof json.phone === "string" ? json.phone : "");
      if (!phone || phone !== claimed) {
        throw new StoreError(400, "Your phone verification expired. Go back and verify your number again.");
      }
    }

    const socials = isRecord(json.socials) ? json.socials : null;
    const body: CreateUserBody = {
      phone,
      authUserId: google?.authUserId ?? null,
      email: google?.email ?? null,
      name: typeof json.name === "string" ? json.name : "",
      handle: typeof json.handle === "string" ? json.handle : "",
      city: typeof json.city === "string" ? json.city : "",
      cityLat: optionalNumber(json.cityLat) ?? null,
      cityLng: optionalNumber(json.cityLng) ?? null,
      cityPlaceId: optionalText(json.cityPlaceId) ?? null,
      age: requireNumber(json.age, "Age"),
      ageMin: requireNumber(json.ageMin, "Youngest age"),
      ageMax: requireNumber(json.ageMax, "Oldest age"),
      instagram: optionalText(json.instagram) ?? optionalText(socials?.instagram) ?? null,
      tiktok: optionalText(json.tiktok) ?? optionalText(socials?.tiktok) ?? null,
      snapchat: optionalText(json.snapchat) ?? optionalText(socials?.snapchat) ?? null,
      artists: Array.isArray(json.artists) ? (json.artists as ArtistInput[]) : [],
    };

    const user = await createUser(body);
    return Response.json(user);
  } catch (error) {
    return errorResponse(error);
  }
}
