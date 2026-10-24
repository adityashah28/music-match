import { requireUser } from "@/lib/auth";
import { errorResponse, readJson } from "@/lib/errors";
import { getUser, updateUser } from "@/lib/store";
import type { ArtistInput, UpdateUserBody } from "@/lib/types";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function optionalText(value: unknown): string | null | undefined {
  if (typeof value === "string") return value;
  if (value === null) return null;
  return undefined;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireUser(request, id);
    const user = await getUser(id);
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    return Response.json(user);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireUser(request, id);
    const json = await readJson(request);
    if (!isRecord(json)) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }

    const socials = isRecord(json.socials) ? json.socials : null;
    const body: UpdateUserBody = {};
    const handle = optionalText(json.handle);
    const city = optionalText(json.city);
    const instagram = optionalText(json.instagram) ?? optionalText(socials?.instagram);
    const tiktok = optionalText(json.tiktok) ?? optionalText(socials?.tiktok);
    const snapchat = optionalText(json.snapchat) ?? optionalText(socials?.snapchat);
    if (handle !== undefined) body.handle = handle;
    if (city !== undefined) body.city = city;
    if (instagram !== undefined) body.instagram = instagram;
    if (tiktok !== undefined) body.tiktok = tiktok;
    if (snapchat !== undefined) body.snapchat = snapchat;
    if (Array.isArray(json.artists)) body.artists = json.artists as ArtistInput[];

    const user = await updateUser(id, body);
    return Response.json(user);
  } catch (error) {
    return errorResponse(error);
  }
}
