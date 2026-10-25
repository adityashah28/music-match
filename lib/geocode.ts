/**
 * City name -> coordinates, via Photon (OpenStreetMap; free, no key, the same service the
 * city picker in lib/cities.ts uses). Shows are all in Northern California or Nevada
 * (Ticketmaster's Bay Area market reaches Sacramento and Reno), so only places in those
 * states are accepted: "Lincoln" is Lincoln, CA, not Nebraska. Cached per server process.
 */
export type Coords = { lat: number; lng: number };

const BAY_AREA = { lat: 37.77, lng: -122.42 };
const STATES = new Set(["California", "Nevada", "CA", "NV"]);
const cache = new Map<string, Coords>();

type Feature = { geometry?: { coordinates?: [number, number] }; properties?: { state?: string } };

async function search(city: string, townsOnly: boolean): Promise<Coords | null> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", city);
  url.searchParams.set("limit", "8");
  url.searchParams.set("lat", String(BAY_AREA.lat));
  url.searchParams.set("lon", String(BAY_AREA.lng));
  // Prefer real towns: otherwise "Lincoln" finds a Lincoln University building in Oakland
  if (townsOnly) for (const tag of ["place:city", "place:town", "place:village"]) url.searchParams.append("osm_tag", tag);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error(`Photon ${res.status}`);
      const { features = [] } = (await res.json()) as { features?: Feature[] };
      const place = features.find((f) => STATES.has(f.properties?.state ?? ""));
      const [lng, lat] = place?.geometry?.coordinates ?? [];
      return typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null;
    } catch {
      await new Promise((r) => setTimeout(r, 800)); // Photon is a shared free service: back off once
    }
  }
  return null;
}

export async function geocodeCity(city: string): Promise<Coords | null> {
  const key = city.trim().toLowerCase();
  if (!key) return null;
  const hit = cache.get(key);
  if (hit) return hit;
  // Towns first; then any place (Stanford is a census district, not a town)
  const coords = (await search(city, true)) ?? (await search(city, false));
  if (coords) cache.set(key, coords);
  return coords;
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: Coords, b: Coords): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
