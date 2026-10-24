import { errorResponse } from "@/lib/errors";
import { getCachedSearch, setCachedSearch } from "@/lib/store";
import type { SearchArtist } from "@/lib/types";

export const dynamic = "force-dynamic";

type SpotifyToken = { value: string; expires: number };
let spotifyToken: SpotifyToken | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function fromDeezer(payload: unknown): SearchArtist[] {
  const rows = isRecord(payload) && Array.isArray(payload.data) ? payload.data : [];
  const artists: SearchArtist[] = [];
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const name = text(row.name);
    if (!name) continue;
    const imageUrl =
      text(row.picture_xl) || text(row.picture_big) || text(row.picture_medium) || text(row.picture);
    const deezerId = row.id == null ? null : String(row.id);
    artists.push({
      name,
      imageUrl: imageUrl && !imageUrl.includes("/images/artist//") ? imageUrl : null,
      spotifyId: null,
      deezerId,
      genres: [],
    });
    if (artists.length === 10) break;
  }
  return artists;
}

function fromSpotify(payload: unknown): SearchArtist[] {
  const artistsNode = isRecord(payload) && isRecord(payload.artists) ? payload.artists : null;
  const rows = artistsNode && Array.isArray(artistsNode.items) ? artistsNode.items : [];
  const artists: SearchArtist[] = [];
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const name = text(row.name);
    if (!name) continue;
    const images = Array.isArray(row.images) ? row.images : [];
    const image = images.find((item) => isRecord(item) && text(item.url));
    const genres = Array.isArray(row.genres)
      ? row.genres.filter((genre): genre is string => typeof genre === "string" && genre.trim().length > 0)
      : [];
    artists.push({
      name,
      imageUrl: image && isRecord(image) ? text(image.url) : null,
      spotifyId: text(row.id),
      deezerId: null,
      genres,
    });
    if (artists.length === 10) break;
  }
  return artists;
}

async function searchDeezer(query: string): Promise<SearchArtist[]> {
  const url = `https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}&limit=10`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Deezer search failed");
  }
  return fromDeezer(await response.json());
}

async function spotifyAccessToken(): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID?.trim();
  const secret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  if (!id || !secret) return null;
  if (spotifyToken && spotifyToken.expires > Date.now() + 15_000) return spotifyToken.value;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data: unknown = await response.json();
  if (!isRecord(data) || !text(data.access_token)) return null;
  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
  spotifyToken = { value: text(data.access_token) as string, expires: Date.now() + expiresIn * 1000 };
  return spotifyToken.value;
}

async function searchSpotify(query: string): Promise<SearchArtist[] | null> {
  const token = await spotifyAccessToken();
  if (!token) return null;
  const url = `https://api.spotify.com/v1/search?type=artist&limit=10&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return fromSpotify(await response.json());
}

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (!query) return Response.json({ artists: [] });

    const cached = await getCachedSearch(query);
    if (cached) return Response.json({ artists: cached });

    const spotify = await searchSpotify(query).catch(() => null);
    const artists = spotify && spotify.length > 0 ? spotify : await searchDeezer(query);
    await setCachedSearch(query, artists);
    return Response.json({ artists });
  } catch (error) {
    return errorResponse(error);
  }
}
