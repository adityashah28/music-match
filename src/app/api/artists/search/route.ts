// GET /api/artists/search?q=mitski
// Asks Deezer, saves the results into `artists` (so every artist gets our own id), returns up to 10.
// If Deezer fails, falls back to artists we've already saved.
import { after } from "next/server";
import { searchDeezerArtists } from "@/lib/deezer";
import { fillMissingColors, saveDeezerArtists, searchSavedArtists } from "@/lib/artists";
import type { Artist, SearchArtistsResponse } from "@/lib/types";

// Recent searches, kept in memory so fast typing doesn't hit Deezer for the same query twice.
// Resets whenever the server restarts, which is fine.
const cache = new Map<string, { at: number; artists: Artist[] }>();
const CACHE_MS = 10 * 60 * 1000;

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return Response.json({ artists: [] } satisfies SearchArtistsResponse);

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return Response.json({ artists: hit.artists } satisfies SearchArtistsResponse);
  }

  let artists: Artist[];
  try {
    const found = await searchDeezerArtists(q, 10);
    artists = await saveDeezerArtists(found);
  } catch (err) {
    console.error("Deezer search failed, using saved artists:", err);
    try {
      artists = await searchSavedArtists(q, 10);
    } catch {
      return Response.json({ error: "Artist search is down. Try again in a moment." }, { status: 502 });
    }
  }

  if (cache.size > 500) cache.clear();
  cache.set(key, { at: Date.now(), artists });

  // Work out background colors for new artists after the response has gone out
  after(() => fillMissingColors(artists.filter((a) => !a.color).map((a) => a.id)));

  return Response.json({ artists } satisfies SearchArtistsResponse);
}
