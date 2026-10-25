import type { SupabaseClient } from "@supabase/supabase-js";
import { geocodeCity } from "@/lib/geocode";
import { normalizeName } from "@/lib/normalize";

/**
 * Turning scraped events into rows of the shows table, shared by the shows seed
 * (scripts/seed-shows.ts) and the Apify webhook, so a scheduled run updates the
 * seeded shows instead of adding second copies of them.
 */

export const BANDSINTOWN_CITIES: Record<string, string> = {
  "san-francisco-ca": "San Francisco",
  "oakland-ca": "Oakland",
  "san-jose-ca": "San Jose",
};

/** When two sources list the same show, keep the first of these (Ticketmaster has real ticket links). */
const SOURCE_PRIORITY = ["ticketmaster", "bandsintown", "songkick"];

export type ShowRow = {
  source: string;
  source_id: string;
  artist_name: string;
  normalized_artist_name: string;
  venue: string | null;
  city: string | null;
  starts_at: string;
  ticket_url: string | null;
  image_url: string | null;
  updated_at: string;
  /** Coordinates of the show's city, filled in by saveShows. */
  lat?: number | null;
  lng?: number | null;
};

/**
 * Bandsintown and Songkick give local Bay Area times without an offset ("2026-11-05T19:00:00").
 * Attach the correct Pacific offset for that date (PST or PDT).
 */
export function pacific(local: string): string {
  const base = local.slice(0, 19);
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "longOffset" })
    .formatToParts(new Date(`${base}Z`))
    .find((p) => p.type === "timeZoneName")
    ?.value.replace("GMT", "");
  return `${base}${offset || "-08:00"}`;
}

/** Same artist, same local day = same show. */
function dedupeKey(row: Pick<ShowRow, "normalized_artist_name" | "starts_at">): string {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date(row.starts_at));
  return `${row.normalized_artist_name}|${day}`;
}

/** A show row, or null if it has no usable artist or date, or has already happened. */
export function show(fields: Omit<ShowRow, "normalized_artist_name" | "updated_at">): ShowRow | null {
  const normalized = normalizeName(fields.artist_name ?? "");
  if (!normalized || !fields.starts_at || Number.isNaN(Date.parse(fields.starts_at))) return null;
  if (Date.parse(fields.starts_at) < Date.now()) return null;
  return { ...fields, normalized_artist_name: normalized, updated_at: new Date().toISOString() };
}

type Item = Record<string, unknown>;
const str = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

/** Items from the aitorsm/bandsintown-events actor. Other items are skipped. */
export function fromBandsintownItems(items: Item[]): ShowRow[] {
  return items.flatMap((e) => {
    // Songkick items have no artistName, so this also tells the two actors apart
    if (!str(e.artistName) || e.eventId == null) return [];
    const startsAt = str(e.startsAt);
    const row = show({
      source: "bandsintown",
      source_id: String(e.eventId),
      artist_name: str(e.artistName)!,
      venue: str(e.venueName),
      city: BANDSINTOWN_CITIES[str(e.scrapedFromCitySlug) ?? ""] ?? null,
      starts_at: startsAt ? pacific(startsAt) : "",
      ticket_url: str(e.ticketUrl) ?? str(e.eventUrl),
      image_url: str(e.imageUrl),
    });
    return row ? [row] : [];
  });
}

/** Items from the aitorsm/songkick-events actor (the headliner is the first performer). Other items are skipped. */
export function fromSongkickItems(items: Item[]): ShowRow[] {
  return items.flatMap((e) => {
    const performers = Array.isArray(e.performers) ? (e.performers as Item[]) : [];
    const headliner = str(performers[0]?.name);
    if (!headliner || e.eventId == null) return [];
    const startDate = str(e.startDate);
    const row = show({
      source: "songkick",
      source_id: String(e.eventId),
      artist_name: headliner,
      venue: str(e.venueName),
      city: str(e.addressLocality) ?? "San Francisco",
      starts_at: startDate ? pacific(startDate) : "",
      ticket_url: str(e.url),
      image_url: str(e.image),
    });
    return row ? [row] : [];
  });
}

/**
 * Save shows, one per artist per day. A show already in the table keeps its slot, so re-imports
 * update rows in place and never add a second copy from another source. Never deletes (RSVPs survive).
 */
export async function saveShows(db: SupabaseClient, candidates: ShowRow[]): Promise<ShowRow[]> {
  // Read every existing show in pages (Supabase caps a select at 1000 rows)
  const taken = new Map<string, string>(); // dedupe key -> "source|source_id" that owns it
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("shows")
      .select("id, source, source_id, normalized_artist_name, starts_at")
      .order("id")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const s of data) {
      if (s.starts_at) taken.set(dedupeKey(s), `${s.source}|${s.source_id}`);
    }
    if (data.length < 1000) break;
  }

  // Stable sort keeps each source's own order (e.g. Ticketmaster per-artist matches ahead of its general list)
  const winners = new Map<string, ShowRow>();
  const usedEvents = new Set<string>(); // one row per source event, even if listed under two artist names
  const sorted = [...candidates].sort(
    (a, b) => SOURCE_PRIORITY.indexOf(a.source) - SOURCE_PRIORITY.indexOf(b.source),
  );
  for (const row of sorted) {
    const key = dedupeKey(row);
    const event = `${row.source}|${row.source_id}`;
    const owner = taken.get(key);
    if (owner && owner !== event) continue;
    if (winners.has(key) || usedEvents.has(event)) continue;
    winners.set(key, row);
    usedEvents.add(event);
  }

  const rows = [...winners.values()];

  // Coordinates of each show's city, so the Shows list can sort by distance (one lookup per city)
  for (const city of new Set(rows.map((r) => r.city).filter((c): c is string => Boolean(c)))) {
    const coords = await geocodeCity(city);
    for (const row of rows) {
      if (row.city === city) Object.assign(row, { lat: coords?.lat ?? null, lng: coords?.lng ?? null });
    }
  }

  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from("shows").upsert(rows.slice(i, i + 200), { onConflict: "source,source_id" });
    if (error) throw new Error(error.message);
  }
  return rows;
}
