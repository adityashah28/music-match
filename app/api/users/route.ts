import { errorResponse, readJson } from "@/lib/errors";
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

export async function POST(request: Request) {
  try {
    const json = await readJson(request);
    if (!isRecord(json)) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }

    const socials = isRecord(json.socials) ? json.socials : null;
    const body: CreateUserBody = {
      handle: typeof json.handle === "string" ? json.handle : "",
      city: typeof json.city === "string" ? json.city : "",
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
