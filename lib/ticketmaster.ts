import { fromTicketmasterClassifications } from "@/lib/genres";
import { localToZoned, show, type ShowRow } from "@/lib/shows-import";

/**
 * Ticketmaster Discovery API (free key, 5000 requests/day, 5/second), shared by the shows
 * seed (whole Bay Area market) and the on-demand import around a viewer (lib/nearby.ts).
 */
export type TicketmasterEvent = {
  id: string;
  url?: string;
  dates?: { start?: { dateTime?: string; localDate?: string; localTime?: string } };
  images?: { url: string; ratio?: string; width?: number }[];
  classifications?: { genre?: { name?: string }; subGenre?: { name?: string } }[];
  _embedded?: {
    venues?: {
      name?: string;
      city?: { name?: string };
      timezone?: string;
      location?: { latitude?: string; longitude?: string };
    }[];
    attractions?: { name: string }[];
  };
};

/** A show row for an event, named after `artistName` (the headliner unless given). */
export function ticketmasterRow(e: TicketmasterEvent, artistName = e._embedded?.attractions?.[0]?.name): ShowRow | null {
  if (!artistName) return null;
  const start = e.dates?.start;
  const venue = e._embedded?.venues?.[0];
  const startsAt =
    start?.dateTime ??
    (start?.localDate ? localToZoned(`${start.localDate}T${start.localTime ?? "20:00:00"}`, venue?.timezone) : "");
  const image = (e.images ?? []).filter((i) => i.ratio === "16_9").sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
  const lat = Number(venue?.location?.latitude);
  const lng = Number(venue?.location?.longitude);
  const row = show({
    source: "ticketmaster",
    source_id: e.id,
    artist_name: artistName,
    venue: venue?.name ?? null,
    city: venue?.city?.name ?? null,
    starts_at: startsAt,
    ticket_url: e.url ?? null,
    image_url: image?.url ?? null,
  });
  if (!row) return null;
  return {
    ...row,
    genres: fromTicketmasterClassifications(e.classifications),
    // The venue's own coordinates: exact, and they work anywhere (no geocoding needed)
    ...(Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0) ? { lat, lng } : {}),
  };
}

/** One page of music events. Throws if TICKETMASTER_KEY is missing or the request fails. */
export async function ticketmasterEvents(params: Record<string, string | number>): Promise<TicketmasterEvent[]> {
  const key = process.env.TICKETMASTER_KEY?.trim();
  if (!key) throw new Error("TICKETMASTER_KEY is not set");
  const query = new URLSearchParams({
    apikey: key,
    classificationName: "music",
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${query}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Ticketmaster returned ${res.status}`);
  const body = await res.json();
  return body._embedded?.events ?? [];
}

/**
 * Upcoming music events within `radiusMiles` of a point, soonest first, up to `pages` x 200
 * (Ticketmaster won't page past the first 1000 results).
 */
export async function ticketmasterNear(lat: number, lng: number, radiusMiles = 60, pages = 3): Promise<ShowRow[]> {
  const rows: ShowRow[] = [];
  for (let page = 0; page < pages; page++) {
    const events = await ticketmasterEvents({
      geoPoint: geohash(lat, lng, 7),
      radius: radiusMiles,
      unit: "miles",
      size: 200,
      page,
      sort: "date,asc",
    });
    for (const e of events) {
      const row = ticketmasterRow(e);
      if (row) rows.push(row);
    }
    if (events.length < 200) break;
    await new Promise((r) => setTimeout(r, 250)); // 5 requests per second
  }
  return rows;
}

/** Geohash for Ticketmaster's geoPoint filter (its latlong filter is deprecated). */
function geohash(lat: number, lng: number, precision: number): string {
  const base32 = "0123456789bcdefghjkmnpqrstuvwxyz";
  let latRange = [-90, 90];
  let lngRange = [-180, 180];
  let hash = "";
  let bits = 0;
  let value = 0;
  let evenBit = true;
  while (hash.length < precision) {
    const range = evenBit ? lngRange : latRange;
    const coord = evenBit ? lng : lat;
    const mid = (range[0] + range[1]) / 2;
    if (coord >= mid) {
      value = (value << 1) | 1;
      if (evenBit) lngRange = [mid, range[1]];
      else latRange = [mid, range[1]];
    } else {
      value = value << 1;
      if (evenBit) lngRange = [range[0], mid];
      else latRange = [range[0], mid];
    }
    evenBit = !evenBit;
    if (++bits === 5) {
      hash += base32[value];
      bits = 0;
      value = 0;
    }
  }
  return hash;
}
