// Deezer's public API: no key or login needed. Used by the seed scripts and artist enrichment.
// Keep calls under ~50 requests per 5 seconds or Deezer starts refusing them.
export type DeezerArtist = {
  id: number;
  name: string;
  picture_medium: string; // 250x250, used for color extraction
  picture_big: string; // 500x500, used in the app
  nb_fan: number;
};

const BASE = "https://api.deezer.com";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Deezer ${res.status} on ${path}`);
  const body = await res.json();
  // Deezer reports errors (like rate limits) inside a 200 response
  if (body.error) throw new Error(`Deezer error: ${body.error.message ?? "unknown"}`);
  return body as T;
}

export async function searchDeezerArtists(query: string, limit = 10): Promise<DeezerArtist[]> {
  const body = await get<{ data: DeezerArtist[] }>(
    `/search/artist?q=${encodeURIComponent(query)}&limit=${limit}`,
  );
  return body.data ?? [];
}

export async function getDeezerRelated(deezerId: number, limit = 10): Promise<DeezerArtist[]> {
  const body = await get<{ data: DeezerArtist[] }>(`/artist/${deezerId}/related?limit=${limit}`);
  return body.data ?? [];
}

// Artists without a photo get a generic placeholder whose URL has an empty hash ("/artist//").
export function realImage(url: string | undefined): string | null {
  if (!url || url.includes("/artist//")) return null;
  return url;
}
