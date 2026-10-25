import { after } from "next/server";
import { requireUser } from "@/lib/auth";
import { enrichArtists } from "@/lib/enrich";
import { geocodeAnywhere } from "@/lib/geocode";
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

function optionalNumber(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
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
    const name = optionalText(json.name);
    const handle = optionalText(json.handle);
    const city = optionalText(json.city);
    const cityLat = optionalNumber(json.cityLat);
    const cityLng = optionalNumber(json.cityLng);
    const cityPlaceId = optionalText(json.cityPlaceId);
    const age = optionalNumber(json.age);
    const ageMin = optionalNumber(json.ageMin);
    const ageMax = optionalNumber(json.ageMax);
    const instagram = optionalText(json.instagram) ?? optionalText(socials?.instagram);
    const tiktok = optionalText(json.tiktok) ?? optionalText(socials?.tiktok);
    const snapchat = optionalText(json.snapchat) ?? optionalText(socials?.snapchat);
    if (name !== undefined) body.name = name;
    if (handle !== undefined) body.handle = handle;
    if (city !== undefined) body.city = city;
    if (cityLat !== undefined) body.cityLat = cityLat;
    if (cityLng !== undefined) body.cityLng = cityLng;
    // A new city without coordinates: look them up, or matching's distance rule can't place it
    if (typeof city === "string" && city.trim() && (cityLat == null || cityLng == null)) {
      const coords = await geocodeAnywhere(city);
      if (coords) Object.assign(body, { cityLat: coords.lat, cityLng: coords.lng });
    }
    if (cityPlaceId !== undefined) body.cityPlaceId = cityPlaceId;
    if (age !== undefined) body.age = age;
    if (ageMin !== undefined) body.ageMin = ageMin;
    if (ageMax !== undefined) body.ageMax = ageMax;
    if (instagram !== undefined) body.instagram = instagram;
    if (tiktok !== undefined) body.tiktok = tiktok;
    if (snapchat !== undefined) body.snapchat = snapchat;
    if (Array.isArray(json.artists)) body.artists = json.artists as ArtistInput[];

    const user = await updateUser(id, body);
    // After responding: fetch Deezer's similar artists for newly added artists that don't have them
    if (body.artists) after(() => enrichArtists(user.artists.map((artist) => artist.name)));
    return Response.json(user);
  } catch (error) {
    return errorResponse(error);
  }
}
